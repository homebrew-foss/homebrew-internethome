---
title: "Tilde 4.0 JamSesh: Multi-device audio playback with WebRTC"
date: "2025-09-13"
tags: [tilde-4.0, summer, mentoring, webrtc, audio, streaming, systems]
description: "JamSesh Blog"
permalink: posts/{{ title | slug }}/index.html
author_name: "Team JamSesh"
author_link: "https://github.com/homebrew-foss/jamsesh"
---

# JamSesh: Multi-device audio playback with WebRTC

JamSesh is a real-time, multi-device audio streaming app built with WebRTC. One device acts as the master and streams audio, while other devices as clients can join at any time and hear the same audio in perfect sync - whether in the same room (to create a speaker-like effect) or across the internet. The core focus is on achieving minimal latency for a seamless, synchronized listening experience.

**Mentees**:  
- Arjun Gowda ([@Gowda-Arjun](https://github.com/Gowda-Arjun))  
- Maaya Mohan ([@maayamohan](https://github.com/maayamohan))  
- Srivani Karanth ([@SriK-1](https://github.com/SriK-1))  
- Tisya Agarwal ([@SolarPhoenix13](https://github.com/SolarPhoenix13))  
- Vanshitha Soma ([@vanshsoma](https://github.com/vanshsoma))  

**Mentors**:  
- Andey Hemanth ([@andy34g7](https://github.com/andy34g7))  
- Mebin Thattil ([@mebinthattil](https://github.com/mebinthattil))  
- Vinaayak G Dasika ([@Delta18-Git](https://github.com/Delta18-Git))  

---

### Introduction

Imagine you're hanging out with friends and jamming to music, and you want everyone to listen to the same music, at the same time, without any awkward delays. That’s what [...drumroll please...] JamSesh is built for :)

JamSesh lets multiple users stream system audio in real time, across devices, with minimal latency (and minimal setup). You just create a room, share the code, play your music and BAM! Everyone hears the same thing at the same time.

JamSesh was built using WebRTC (Web Real-Time Communication), a browser-native technology that enables real-time media sharing between devices. However, getting this technology to work for synchronised audio streaming across networks required a deeper understanding of how WebRTC works under the hood. We needed to take a deeper dive into how it handles peer-to-peer communication, network traffic routing, and media flow.

---

### Understanding WebRTC

WebRTC is an open-source framework used by applications like Google Meet, WhatsApp Web, and Discord to transmit audio, video, and other data directly between browsers or mobile devices. It is designed to be fast, secure, and efficient by working on a peer-to-peer model. This means that instead of sending media through a central server, devices send it directly to each other, reducing latency and server load.

To make this happen, WebRTC relies on a few key components:  

* a signaling server  
* ICE (Interactive Connectivity Establishment) candidates  
* NAT (Network Address Translation) traversal using STUN (Session Traversal Utilities for NAT) and TURN (Traversal Using Relays around NAT)

Each of these plays a role in establishing and maintaining a direct connection between two or more peers.

---

### Signaling and Peer Connection Setup

To begin with, peers need a way to find each other and exchange connection information. This is done through signaling.  

The signaling server helps peers exchange metadata like Session Description Protocol (SDP) offers and answers, and ICE candidates.  

SDP refers to messages that describe the capabilities and preferences of each peer, such as the media formats they support, relevant hardware specifications and how they want to communicate. ICE candidates are network details that help peers find the best possible route to connect, even if they are behind firewalls or routers. These pieces of information are key to negotiating the connection.  

The signaling server only facilitates the initial handshake and does not handle any media once the connection is established. However, if necessary, it might handle further communication, for instance, letting a client know that a peer has disconnected.

[![signaling server.png](https://i.postimg.cc/J0sfP5qH/sig-server.png)](https://postimg.cc/T5XNPmBT)

Since WebRTC does not define how signaling should occur, we built a signaling server using WebSockets and deployed it on Render. We first set up a local version of the signaling server to test on a single device, just to verify that our signaling logic was meaningful. Once that was stable, we deployed the server on Render so that users on different networks and devices could connect through the internet. We chose Render as it provided us with a free version (with some limitations of course, but that was a trade-off we were willing to make). Render also did not need us to provide them with any confidential details, which made the set-up smoother for us.  

After this negotiation, peers begin to collect ICE candidates. ICE candidates provide details about the various network pathways two or more peers can use to connect i.e. different IP addresses and ports. Each device sends its list to the other, and WebRTC tries various combinations to find the best possible connection path. If one works, the connection is established and the media transfer can begin.

---

### Handling NAT (STUN and TURN Servers)

Pretty smooth sailing so far but now some trouble arises. Most users are behind routers that use Network Address Translation (NAT). This means that their internal IP addresses, which identify devices only inside a particular local network, are hidden and not visible to the wider internet. As a result, devices on the public internet find it tricky to initiate direct connections. NAT is great for security and privacy, but unfortunately for us, it makes peer-to-peer communication much more difficult.  

To address this, WebRTC uses STUN servers. These servers allow a device to discover its public-facing IP address and port; enabling devices to attempt establishing a direct connection. This is usually enough for users who are mainly behind three types of NATs: full-cone, IP-restricted, and port-restricted. These types allow predictable address mapping, which STUN can handle.

[![nat.png](https://i.postimg.cc/7P78Gmfj/nat.png)](https://postimg.cc/CdF69CC4)

There is, however, a fourth, more complex type of NAT. Symmetric NATs change the port mapping every time a request is made, making it very difficult for two peers to connect directly. In those cases, TURN servers are required. A TURN server acts as a middleman, relaying media between peers. This is more resource-intensive and slightly slower, but ensures that a connection can still be made when direct communication is not possible.  

When we started, we were assigned a mini-project to obtain our public-facing IP address from a STUN server. This gave us a chance to familiarise ourselves with how it works before diving into the actual project.

The whole process comes together like so:
[![webRTC process.png](https://i.postimg.cc/2SH8c2d2/web-RTCprocess.png)](https://postimg.cc/RWHBq1DH)

---

### The First Breakthrough: 1-1 Video Calling

Once we had signaling, ICE candidates, and NAT traversal in place, we tested our setup by building a basic 1-1 video calling interface. This was our first real proof-of-concept. Watching two browsers communicate in real time, with both video and audio working, was an exciting accomplishment :)

Even though video wasn’t part of our final goal, we chose to start here because:  

* Video examples and documentation are more widespread.  
* It helped validate our signaling and peer logic before shifting focus to device audio capture.  

The video call setup served as the blueprint for our entire project, helping us gain a solid grasp on signaling, peer connections, and the fundamentals of real-time media streaming. It helped us solidify the foundations before exploring more challenging tasks.

[![video call.jpg](https://i.postimg.cc/WzQ0kszq/vid-call.jpg)](https://postimg.cc/PvQLGsmd)

Above: the very first video call between Maaya and Vanshitha

---

### Capturing System Audio

With our solid foundation in place, we then shifted our focus to our primary goal: capturing and streaming system-wide audio from the client. Unlike microphone input, which is fairly easy to access via the browser, capturing system audio is a much more nuanced process.  

There's a catch here: browsers don’t let you capture ONLY system audio.  

The common workaround is to request both system audio and screen video using the screen sharing functionality. So that’s exactly what we did - we requested both streams, ignored the video and utilised just the audio track.

This approach is not perfect. It requires user interaction and a screen share prompt, which adds friction. It also limits the feature to browsers and operating systems that support system audio capture during screen share. Nonetheless, it was the most reliable way to get high-quality system audio without needing native code or third-party software.

[![browser compatibility.png](https://i.postimg.cc/QdG2J5WV/browser-comp.png)](https://postimg.cc/9rbgWDbj)

---

### Multi-User Streaming

Once we had system audio streaming between two peers, we expanded the setup to support multiple users listening at the same time. This was a big step toward our final vision for JamSesh.  

We introduced a master-client model. One device acts as the master and streams audio, while all other clients connect directly to it as listeners. Each client establishes its own WebRTC connection with the master. Room codes are generated by the master and can be shared with others for quick joining.  

This setup allows multiple users to hear the same audio in sync, even if they are located in different parts of the world.

---

### Multi-Room Support

After getting multi-user sessions working, the next step was to add support for multiple rooms running independently. Each room has:  

* One designated master who streams audio  
* Multiple clients who connect to that master  
* A unique code used to identify and join the room  

This design allows for simultaneous sessions to take place without interference, and it keeps the architecture simple and scalable.  

[![room logic.png](https://i.postimg.cc/ydLMBbdb/room-logic.png)](https://postimg.cc/sQZ64K5Y)

Before we could go about this, we had to make some modifications to our client-side script files to separate master and listener logic. This required a rewrite of the entire client-side code. Once that was out of the way, we could proceed to reconfigure the signaling and TURN servers to support this room logic.

---

### Further Optimizations

Now that we are approaching the final stages, all that's left are some enhancements and touchups. With functionality in place, we turned our attention to improving the quality of the audio stream.  

We used the Opus codec, which is optimised for real-time applications. It provides low-latency, high-quality audio and handles compression well. We increased the audio bitrate for cleaner and more consistent playback.  

To handle varying network conditions, we implemented automatic bitrate adjustment. This lets the stream dynamically scale up or down depending on each client’s connection strength, which helps avoid dropouts or lag when bandwidth is limited.  

Now talking about our user interface, initially we had a very basic setup which was mainly made to satisfy the video-call indentation.  

It did not exactly comply with our vision of an application where people would head over to jam to music with their buddies.  

We further optimised it to look user friendly—where there were two windows for showcasing peer to peer connection using face cams, now there exists a nice front page, as you enter JamSesh, where it gives the user two main options: to either **Host a Jam** or to **Join a Jam**. The user is allowed to input their name and generate a code (Host) or enter a code (Join).  

Once the user has entered the room, they are welcomed with a playback bar showing elapsed time and a list of friends on the side who are present in the room.  

We tried to make it as easy to use, and we are looking forward to adding more features such as in-room chat where people can add their song recommendations as well as catch up in general!  

Here’s JamSesh in all its glory (at the time of penning this blog):  

[![landing.png](https://i.postimg.cc/14hJZGpd/jamsesh-name.png)](https://postimg.cc/rRjS1tZG) 
*Above: JamSesh Landing Page*  

[![room code.png](https://i.postimg.cc/65rDpqyZ/jam-code.png)](https://postimg.cc/Wh4992mp)
*Above: Host sets up the room*

[![JamSesh in session.png](https://i.postimg.cc/x8tM6L6H/jamsesh-sesh.png)](https://postimg.cc/rRRDmRXF) 
*Above: After joining the room ft. JamSesh mentees*  

---

### Wrapping Up

JamSesh was such a fun project to build. We learned a lot, broke things along the way, and got them working again. More than anything, it was about creating something that makes listening to music with friends feel effortless. We hope you enjoy using it as much as we enjoyed making it!
