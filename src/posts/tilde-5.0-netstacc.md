---
title: "Tilde 5.0 Netstacc: A Custom TCP/IP Network Stack"
date: "2026-08-30"
tags: [tilde-5.0, networking, c, systems]
description: A custom TCP/IP network stack built from scratch in C, complete with a live HTML dashboard served via a minimal internal HTTP server.
permalink: posts/{{ title | slug }}/index.html
author_name: "Team Netstacc"
author_link: "https://github.com/homebrew-foss/Netstacc"
---

# Tilde 5.0 Netstacc: A Custom TCP/IP Network Stack

Written By [Team Netstacc](https://github.com/homebrew-foss/Netstacc)

Tilde 5.0 | 8 min read

**Mentees:**
- Aishwarya ([@itsmeAishwarya](https://github.com/itsmeAishwarya))
- Vansh ([@Vanshdev3](https://github.com/Vanshdev3))
- Visruth ([@beppvis](https://github.com/beppvis))

**Mentors:**
- Mahilan Suki
- Sarah
- SelvaGanesh
- Shashi

---

## What is Netstacc?

Let's first start with an analogy, which we personally felt would relate to a lot of concepts in computer networking (apart from traffic in Bangalore :) ) - **the postal system**.

We know that every piece of mail gets sorted by the post office using the information written on its envelope. Something like:
- Where it's heading to (receiver's address)
- Where it came from (sender's address)
- What type of delivery it is
- How it should be handled!

Normally, it's your OS (operating system) doing all of this automated sorting. Packets come in, the OS silently processes them, decides what to do, and sends responses back. We never really wonder, nor get to see, what's happening inside.

Every time you send a request over the internet, there's a whole networking stack working behind the scenes to make sure your data actually gets where it needs to go. Your OS handles all of this for you, so most of the time you don't really have to think about it.

**Now, what if you could build parts of this networking stack yourself?**

That was exactly what we did here in NetStacc :D

NetStacc is our implementation of a custom TCP/IP stack in C. We capture packets through a TUN device, parse their headers, identify the protocols they belong to, and handle them ourselves. Our implementation supports ICMP, UDP, and parts of TCP, including connection establishment and state tracking.

We also built a live dashboard to monitor packet activity, protocol statistics, and connection states as the stack runs.
---

## How Did We Build It: Architecture

![Architecture diagram](https://raw.githubusercontent.com/homebrew-foss/Netstacc/main/blog/images/architecture.png)
> *Each row roughly corresponds to a specific week's agenda in our 5-week roadmap.*

This was our roadmap for the entire five weeks. We decided to approach the project layer by layer, following how a packet actually moves through a networking stack. This helped us break the implementation into smaller stages, with each week focusing on a different part of the stack.

We started our journey by taking a look at the **TUN device**.

A TUN device is a virtual network interface that allows applications to handle IP packets in userspace. To the operating system, it behaves like a regular network interface, similar to Wi-Fi or Ethernet. However, instead of sending packets to physical network hardware, it passes them to the userspace program that opened the device.

This makes TUN particularly useful for applications such as VPNs and custom networking tools, where packets need to be intercepted, processed, or forwarded by an application.

We used this mechanism to create our own `tun0` interface and receive packets directly in our C program.

This is where our program receives raw IP packets into its buffer. From there, we pull out the **IPv4 header**, which gives us information about the packet like its source and destination IP addresses, TTL, checksum and, crucially for us, the protocol field.

The protocol field tells us what kind of data is carried after the IPv4 header. These values aren't arbitrary; they follow the protocol number assignments maintained by the **Internet Assigned Numbers Authority (IANA)**. For example, `1` represents ICMP, `6` represents TCP, and `17` represents UDP.

We use this field to identify the packet's protocol and pass it to the corresponding handler.

From here, the packet can take one of three different paths:

1. **ICMP:** Packets go through the ICMP parser, where we check the header and respond to echo requests (i.e., your regular old ping).
2. **UDP:** Packets here go through the UDP parser, where we parse the UDP header and generate the required response.
3. **TCP:** TCP is a little more involved. After parsing the TCP header and verifying the checksum, the packet gets passed into a **TCP state machine**, which keeps track of where a connection currently stands and helps us decide what response needs to go out next.

Eventually, though all of these paths end up at the same place. 

Every response packet our stack builds converges at the final write-back step, where we write it back to the TUN device using the `write()` system call.

And that's the whole pipeline : a packet comes in, we figure out what it is, process it ourselves, and send a response back out. 

---

## Getting Packets into Userspace: the TUN Device

Before we even get to parsing anything, we needed a way to actually get packets into our own hands. That's where TUN comes in.

You've probably used a VPN at some point without really thinking about how it works. Well, this is basically it. A VPN app on your laptop doesn't have some special kernel-level access. 

What it actually does is create a TUN interface, grab whatever packets your OS sends to it, and do its own thing with them (encrypt, forward, whatever) before they hit the real network. 

To your OS, a TUN interface just looks like any other network device, like your wifi card or ethernet port. It even shows up when you run `ip a`. On my laptop, `tun0` shows up right alongside the other interfaces with its own IP and UP state, just like wifi. The only difference is that instead of talking to hardware, **it talks straight to whatever program opened it.**

So we did exactly that. 

We created our own `tun0`, gave it an IP (`10.0.0.1`) the same way you'd assign an IP to any interface, and brought it up. From that point, any traffic the OS sends to `10.0.0.1` doesn't go anywhere near the kernel's networking code. 

**It lands directly in our program's buffer through a plain `read()` call.**

```c
int tun_alloc(char *dev) {
    struct ifreq ifr;
    int fd = open("/dev/net/tun", O_RDWR);

    memset(&ifr, 0, sizeof(ifr));
    ifr.ifr_flags = IFF_TUN | IFF_NO_PI;
    strncpy(ifr.ifr_name, dev, IFNAMSIZ);

    ioctl(fd, TUNSETIFF, (void *) &ifr);
    return fd;
}
```

`IFF_TUN` tells the kernel we want raw IP packets, not full ethernet frames (that would be TAP, which also carries MAC addresses and stuff we don't care about here). `IFF_NO_PI` strips a small extra header the kernel would otherwise prepend to each packet. We don't need it.

Once this is set up, the idea is pretty simple: pinging `10.0.0.2` from another terminal is basically the same as pinging any real IP, except instead of the kernel replying, **our C program is the one deciding what happens next.** 

That one `read()` call is the entire handoff from kernel space to userspace. Everything after it is ours to mess with (or break, which happened a lot in week 1 :D).

![TUN packet flow](https://raw.githubusercontent.com/homebrew-foss/Netstacc/main/blog/images/tun.jpg)
> *How a ping flows from the host terminal, through tun0, into our C program, and back out.*

**To try it:** `sudo ip addr add 10.0.0.1/24 dev tun0 && sudo ip link set dev tun0 up`, then `ping -c 3 10.0.0.2` from another terminal. The raw packets show up on the Netstacc side.

---

## IPv4 Parsing

Once a packet lands in our buffer from the TUN device, the first thing we need to do is figure out what's actually inside it. That starts with the IPv4 header.

We could've gone byte by byte, manually pulling out each field with bit shifts and masks, but that gets messy fast and there's a cleaner way. 

Since the IPv4 header has a fixed, well-documented layout, we can just **cast a struct directly over the raw buffer:**

```c
struct ipv4_header *ip = (struct ipv4_header *) buf;
```

After the cast, reading the header is just normal struct access. `ip->protocol` to know what kind of packet it is, `ip->src_ip` and `ip->dest_ip` to know where it came from and where it's going.

The two fields we care about most here are the source/destination IPs and `ip->protocol`. The IPs tell us who this packet is from and where it's headed. The protocol byte tells us what kind of packet we're holding: is this ICMP, TCP, or UDP? Everything downstream depends on getting that one byte right.

```c
void classify_protocol(struct ipv4_header *ip, uint8_t *buf, int tun_fd) {
    int header_len = (ip->version_ihl & 0x0f) * 4;
    uint8_t *payload = buf + header_len;

    switch (ip->protocol) {
        case IPPROTO_ICMP: handle_icmp(ip, buf, tun_fd); break;
        case IPPROTO_TCP:  handle_tcp(ip, payload, ntohs(ip->total_length) - header_len); break;
        case IPPROTO_UDP:  handle_udp(ip, payload, ntohs(ip->total_length) - header_len); break;
    }
}
```

One thing that caught us: the IHL field gives header length in **32-bit words**, not bytes. So you need to multiply by 4. If you miss that, every field after it reads wrong. Not an obvious crash, just subtly garbage numbers that look almost right. That cost us some time.

Once we've read what we need, we pass the same pointer forward, first to verify the header checksum, and then to the protocol classifier which sends it to the right handler. 

**We don't copy the packet around at every step**, we just pass pointers into the same buffer. The memory is only copied once, at the initial `read()`.

![IPv4 header layout](https://raw.githubusercontent.com/homebrew-foss/Netstacc/main/blog/images/ipv4.jpeg)
> *The IPv4 header byte layout. Each field maps directly to a struct member in our code.*

---

## Protocol Classifier

As mentioned above, this is our dispatch point. 

So at this point, we've got a packet, and we've parsed its IPv4 header. The IPv4 header gives us a bunch of information about the packet, but one field in particular tells us what we're supposed to do next: **the protocol field**.

Because an IP packet doesn't necessarily always contain the same thing. Sometimes it could be an ICMP packet, sometimes UDP, sometimes TCP. And obviously, we can't just throw all of them into the same parser and hope for the best :D

This is where our protocol classifier comes in.

The protocol field basically tells us what's sitting right after the IPv4 header: `1 = ICMP`, `6 = TCP`, and `17 = UDP`. But before we get there, we first need to figure out where the IPv4 header actually ends.

```c
int header_len = (ip->version_ihl & 0x0f) * 4;
uint8_t *payload = buf + header_len;
```

You might be wondering, *wait, why can't we just assume the header is always 20 bytes?*

That's because IPv4 headers can have options, which means their length can vary. So rather than assuming, we use the IHL field to calculate its actual size and move our pointer past it. And now we're finally looking at the actual payload!

From here, it's actually pretty straightforward. We look at the protocol field and send the packet wherever it's supposed to go.

```c
switch (ip->protocol) {
    case IPPROTO_ICMP:
        handle_icmp(ip, buf, tun_fd);
        break;
    case IPPROTO_TCP:
        handle_tcp(ip, payload, payload_len, tun_fd, buf);
        break;
    case IPPROTO_UDP:
        handle_udp(ip, payload, payload_len);
        break;
    default:
        unknown_drops++;
        break;
}
```

ICMP goes to the ICMP handler, UDP goes to the UDP handler and TCP... well, TCP gets to have its own little world of problems (trust us, it's not little :D). 

Anything we don't support just gets dropped. So yeah, in simple words this is basically our little traffic controller. A packet enters, we look at what it's carrying, and point it to the right direction.

---

## ICMP

ICMP (Internet Control Message Protocol) was created to send error messages and operational information indicating success or failure when communicating with other IP addresses.

Fun fact: ICMP is a network layer protocol.

ICMP is crucial for us, since with this we can confirm if Netstacc is functioning properly by using the `ping` command. To get started, we read through RFC 792 and [this blog](https://www.saminiir.com/lets-code-tcp-ip-stack-2-ipv4-icmpv4/) by Saminiir.

Just like how we did for the IPv4 header, we created a struct definition according to the ICMP header. Using the struct, we cast it onto our payload, which we got from offsetting buffer bytes by IHL.

Then a check if ICMP is of an echo type. If so, we send back an echo reply by creating a new packet.

---

## UDP

So we know that it’s IP's job to get a packet from one machine to another, but it pretty much stops there. IP doesn't really know what *application* on that machine is supposed to receive the packet. 

Say you have multiple programs running on your machine: a DNS resolver, a game, a video call. Packets can arrive at the same IP address, but IP alone has no way of knowing which application each one belongs to.

This is where transport layer protocols like UDP and TCP come in. 

UDP stands for **User Datagram Protocol**. The "user" here refers to the application using it, a datagram is basically a self-contained piece of data, and a protocol is just a set of rules both ends follow while communicating.

So how does UDP actually solve this problem? **Port numbers!!**

Think of a port number as something layered on top of an IP address. The IP address gets the packet to the right machine, and the port number gets it to the right application on that machine.

### The UDP Header

One interesting thing about UDP is that it's intentionally minimal - unlike TCP, it doesn't keep track of connections, guarantee delivery, or care whether packets arrive in order. Its header is correspondingly simple. It consists of just four 16-bit fields, making the entire header a fixed 8 bytes long:

- **Source Port:** where the packet came from
- **Destination Port:** where it's supposed to go
- **Length:** tells us the size of the UDP datagram
- **Checksum:** used to verify the integrity of the packet

![UDP diagram - header](https://raw.githubusercontent.com/homebrew-foss/Netstacc/main/blog/images/udp-v2.jpeg)
> *The UDP pseudo-header exists only for checksum math, then gets thrown away.*

And if you notice, **there are no IP addresses here!** Well, that's because UDP sits on top of IP, and the source and destination IP addresses have already been handled by the IPv4 layer.

But there's something else worth considering: what if an IP address gets corrupted while the packet is being transmitted? How would we detect that?

### Implementing the Checksum

While implementing UDP, we had to pay particular attention to checksum verification. This involved understanding how the pseudo-header contributes to the checksum calculation.

You guys might be wondering: UDP already has a header, so why does it suddenly need another one? And why is it called "pseudo" in the first place? 

Let's say the destination IP address gets corrupted while the packet is being transmitted. If UDP calculated its checksum using only its own header and data, it wouldn't account for changes to the IP addresses.

This is where the pseudo-header comes in! By including the source and destination IP addresses in the checksum calculation, UDP can detect corruption in these fields too. IPv4 has its own header checksum, but the pseudo-header provides additional checksum coverage at the transport layer.

UDP temporarily creates this while calculating the checksum. It contains the source IP address, destination IP address, a zero-filled byte, the protocol number, and the UDP length. 

**This isn't actually sent as part of the UDP packet.** 

It's constructed temporarily by the sender while calculating the checksum. The receiver then reconstructs the corresponding pseudo-header while verifying the checksum. And that's why it's called a *pseudo-header*: it doesn't actually exist as a separate header on the network.

This is basically what that looks like in our implementation:

```c
uint16_t compute_udp_checksum(struct ipv4_header *ip, struct udp_header *udp, int len) {
    struct udp_pseudo_header pseudo;
    pseudo.src_ip = ip->src_ip;
    pseudo.dest_ip = ip->dest_ip;
    pseudo.protocol = IPPROTO_UDP;
    pseudo.udp_length = htons(len);
    
    int total_len = sizeof(pseudo) + len;
    uint8_t *buf = malloc(total_len);
    memcpy(buf, &pseudo, sizeof(pseudo));
    memcpy(buf + sizeof(pseudo), udp, len);
    
    uint16_t result = compute_checksum(buf, total_len);
    free(buf);
    return result;
}
```

One issue we ran into was with the UDP length field while constructing the pseudo-header. The value was stored in host byte order, but the pseudo-header needed it in network byte order (big-endian), the standard format used for multi-byte values in network protocols.

We used `htons()` to convert the length from host byte order to network byte order before calculating the checksum. Without this conversion, the checksum calculation could produce an incorrect result.

And to make sure we weren't just convincing ourselves that the checksum worked, we compared our computed values with Wireshark's checksum calculations for the exact same packets.

![Wireshark live packet capture on tun0](https://raw.githubusercontent.com/homebrew-foss/Netstacc/main/blog/images/wireshark.png)
> *Live packet dissection on tun0 in Wireshark: verifying packet bytes, IP headers, and raw payload directly on the wire.*

---

## TCP

Let's move to the second transport layer: **TCP (Transmission Control Protocol)**. 

UDP was pretty straightforward : a packet comes in, we look at the header, verify the checksum, and deal with it. TCP goes a step further.

Unlike UDP, TCP is connection-oriented. Before two machines can actually start exchanging data, they need to establish a connection, and TCP needs to remember what's happening with that connection throughout its lifetime.

Which means that NetStacc needs some memory, too!

Say two different clients are talking to our stack at the same time. We can't just look at an incoming TCP packet and treat it as something completely new every single time. We need to know who this packet belongs to and, more importantly, **where that particular connection currently is**. 

For this, we used something called a **Transmission Control Block (TCB)**.

Each active connection gets its own entry where we store things like the client's IP address, source and destination ports, sequence numbers, and the current TCP state. Whenever a TCP packet arrives, we first check if we already know this connection. 

If it's a new connection, we create a new entry for it. If we've seen it before, we retrieve its existing state and continue from wherever we left off. 

### The TCP State Machine

A TCP connection doesn't just have two states (connected and disconnected). There's an entire sequence of states in between. Every transition happens because of a specific packet arriving. 

A `SYN` (Synchronize) starts things off, an `ACK` (acknowledgement) confirms something, and a `FIN` (finish) begins closing it. So instead of writing a bunch of unrelated "if" statements and hoping everything works, **we modelled this using a TCP state machine.**

- Initially, NetStacc sits in the `LISTEN` state, waiting for someone to connect.
- When a client wants to establish a connection, it sends a `SYN`. NetStacc receives it, stores the connection details, and responds with a `SYN + ACK`.
- At this point, the connection moves to `SYN_RCVD` and waits for one final acknowledgement from the client.
- Once that `ACK` arrives, we're officially in the `ESTABLISHED` state.

And now, finally, actual data can flow.

One thing we found pretty fascinating here is that data transfer itself doesn't necessarily change the connection state. The connection can just sit in `ESTABLISHED` while both sides keep sending data back and forth, until someone decides that the session is done.

When the client wants to close the connection, it sends a `FIN`. NetStacc acknowledges it and moves into `CLOSE_WAIT`. But why another state apart from `FIN` to close the connection?

This state exists because even though the client is done sending data, the server might not be done yet. Maybe it still has something to send back! So `CLOSE_WAIT` gives the server time to finish whatever it was doing before closing its side of the connection.

Right now, our state machine only fully handles `SYN_RCVD` and `ESTABLISHED`, so we acknowledge the `FIN` and stop there instead of sending our own `FIN` back and going through `TIME_WAIT` to `CLOSED`.

So yeah, TCP is basically a constant loop of:
* *"Where are we right now?"*
* *"What packet just arrived?"*
* *"What are we supposed to do next?"*

And that's exactly what our state machine handles.

![TCP Connection Workflow](https://raw.githubusercontent.com/homebrew-foss/Netstacc/main/blog/images/tcp-connection-workflow.png)
> *The complete state machine workflow for a TCP connection.*

### The Three-Way Handshake

Let's zoom into the part where the connection actually begins. Before any data is exchanged, TCP runs a three-step handshake. But why three steps? 

Both sides need to make sure that the other side is reachable, and they also need to agree on the **sequence numbers** they'll use for the connection.

![Three-way handshake diagram](https://raw.githubusercontent.com/homebrew-foss/Netstacc/main/blog/images/tcp.jpeg)
> *Three messages, and a state machine that has to track every one of them correctly.*

It starts with the client sending a SYN.

1. The client chooses a starting sequence number, let's call it `x`, and sends: `SYN (seq = x)`. NetStacc receives this. 
2. NetStacc needs to provide its own starting sequence number. So it chooses another number, say `y`, and responds with `SYN + ACK (seq = y, ack = x + 1)`. The ACK part confirms that it received the client's SYN.
3. Finally, the client acknowledges the server's sequence number: `ACK (seq = x + 1, ack = y + 1)`.

And that's it!! Both sides now know that the other one is reachable, and where the sequence numbers start. The connection moves to `ESTABLISHED`.

### TCP's Pseudo-Header

Just like UDP, TCP also uses a pseudo-header for its checksum, for the exact same reasons.

Since TCP headers don't contain source and destination IP addresses, a corrupted IP address could lead to a packet being routed to the wrong place while still passing the TCP checksum. 

So while calculating the TCP checksum, TCP temporarily constructs a pseudo-header containing:
- Source IP address
- Destination IP address
- Protocol number
- TCP length

Then why is TCP's checksum implementation a little more interesting than UDP's? 

Well, UDP is a datagram protocol. You receive a packet, verify it, and you're mostly dealing with that packet independently. TCP, on the other hand, is maintaining an entire conversation.

After verification succeeds, NetStacc also has to figure out which connection that segment belongs to, what state that connection is currently in, and what response should come next.

At this point, a TCP packet entering NetStacc goes through an entire gauntlet:
`TUN Device → IPv4 Parsing → Protocol Classifier → TCP Parsing → Checksum Verification → Connection Lookup → TCP State Machine → Response → Write Back`

---

## The Dashboard

To keep track of packet counts and drops without staring at terminal logs, we added a live dashboard with two views: terminal and browser.

**The terminal side** is simple. It just uses ANSI escape codes (`\033[2J\033[H`) to clear the screen and reset the cursor to the top left, then reprints `live_stats` in place on every refresh. No ncurses, no extra libraries, just a struct and `printf` calls.

```c
void render_dashboard() {
    printf("\033[H"); // Move cursor to top left

    time_t now = time(NULL);
    long uptime = (long)difftime(now, live_stats.start_time);
    int hrs = uptime / 3600;
    int mins = (uptime % 3600) / 60;
    int secs = uptime % 60;
    long rate = (uptime > 0) ? (live_stats.total_rx_packets / uptime) : live_stats.total_rx_packets;

    printf("  Target Device: %stun0%s | Uptime: %02d:%02d:%02d | Rate: %ld pkts/s\n",
           C_WHITE, C_RESET, hrs, mins, secs, rate);

    printf("  PROTOCOL         RX PACKETS   RX BYTES    TX PACKETS   TX BYTES\n");
    printf("  ICMP (Ping)      %-13lu %-11lu %-13lu %-10lu\n",
           live_stats.icmp.rx_packets, live_stats.icmp.rx_bytes,
           live_stats.icmp.tx_packets, live_stats.icmp.tx_bytes);
    printf("  UDP (App)        %-13lu %-11lu %-13lu %-10lu\n",
           live_stats.udp.rx_packets, live_stats.udp.rx_bytes,
           live_stats.udp.tx_packets, live_stats.udp.tx_bytes);
    printf("  TCP (Stack)      %-13lu %-11lu %-13lu %-10lu\n",
           live_stats.tcp.rx_packets, live_stats.tcp.rx_bytes,
           live_stats.tcp.tx_packets, live_stats.tcp.tx_bytes);

    printf("  Non-IPv4 Traffic : %s%lu%s\n", C_RED, live_stats.drops.non_ipv4, C_RESET);
    printf("  Bad Checksums    : %s%lu%s\n", C_RED, live_stats.drops.bad_checksum, C_RESET);
    printf("  Unknown Protocols: %s%lu%s\n", C_RED, live_stats.drops.unknown_proto, C_RESET);
}
```

**The browser view** is built straight into `classifier.c` using `snprintf` calls that stitch the HTML together with the live numbers plugged in. Not the prettiest way to do it (editing the page layout means scrolling through escaped HTML inside C code), but it works and gets the job done.

The coolest part is that there's no actual web server running like Nginx or Apache. **It's just our own TCP stack doing it.**

Once a connection reaches `ESTABLISHED` (using the same handshake logic from the TCP section), whatever data comes in is just payload to us. We check if that payload starts with `"GET "`. 

If it does, we know a browser is asking for the page! 

We build an `HTTP/1.1 200 OK` response by hand right there in `classifier.c` (status line, headers, and the HTML body with a `<meta http-equiv="refresh" content="2">` tag so it auto-reloads every 2 seconds) and push it out through the exact same write path every other response uses.

So when you open `http://10.0.0.1:8080` or `curl` it, our TCP stack is literally the one handling your browser's request. Same code path as a ping reply, just with HTTP on top.

![Dashboard live view](https://raw.githubusercontent.com/homebrew-foss/Netstacc/main/blog/images/dashboard-live.png)
> *Per-protocol counts, drops, and active TCP connection state updating live in the browser.*

![Terminal and browser side by side](https://raw.githubusercontent.com/homebrew-foss/Netstacc/main/blog/images/dashboard-terminal.png)
> *Left: terminal running ping and netcat tests. Right: browser dashboard updating in real time.*

---

## Future Scope

- **TCP congestion control:** This is an integral part of TCP, which ensures that packets don't cause congestion in networking. Reducing congestion reduces the chances packets get dropped and allows reliable data transmission.
- **IPv4 to IPv6 migration:** Current implementation only works for IPv4 address connection which is outdated, and we would love to migrate to the new standard.
- **DNS:** Implementing the DNS protocol which allows us to handle DNS queries. This is the system that is responsible for finding out what is the IP for the given hostname.
- **HTTPS:** Currently we have hardcoded it so that whenever we receive a GET request we send in our HTML webpage and json data follows through. We want the later version of netstacc to be able to understand the HTTP request and respond to it accordingly.
- **Multithreading:** Netstacc is a single threaded application which doesn’t allow us to handle multiple connections at once, we would love to migrate to multithreaded architecture.

---

## References

- [Netstacc Repository](https://github.com/homebrew-foss/Netstacc)
- [RFC 791 - Internet Protocol](https://datatracker.ietf.org/doc/html/rfc791)
- [RFC 793 / 9293 - Transmission Control Protocol](https://datatracker.ietf.org/doc/html/rfc9293)
- [Linux TUN/TAP Documentation](https://www.kernel.org/doc/Documentation/networking/tuntap.txt)
- [Let's code a TCP/IP stack, 2: IPv4 & ICMPv4 (Saminiir)](https://www.saminiir.com/lets-code-tcp-ip-stack-2-ipv4-icmpv4/)

**Slides and docs: (just for reference :D)**
- Week 1: [Slides](https://docs.google.com/presentation/d/1_HTu972tAZ9nAV1ofrF1PEVR8UqGgDZz1HNl-QjaFm8/edit?usp=sharing)
- Week 2: [Docs](https://docs.google.com/document/d/1W-0PoB5Ndg23Kw0e0w-LE1WNvaYqPXTnnHbIqv4IEvs/edit?usp=sharing)
- Week 3: [Slides](https://docs.google.com/presentation/d/1wBWpKk7wZ-KGFR8Cx5bkjKsRs1TRscB7aLhzKfCdnOI/edit?usp=sharing)
- Week 4: [Docs](https://docs.google.com/document/d/1Nak1niEzwp-o3kx28p8uAKssy9WoPPQTIHqLDPZk13w/edit?tab=t.0#heading=h.1j0h99oqol5p)
- Week 5: [Slides](https://docs.google.com/presentation/d/1wm0OurWrNNRHzIo2CXXwbPwivTgAraWV9QlMg7csZOM/edit?usp=sharing)
