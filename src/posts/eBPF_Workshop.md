---
title: Buzzing with eBPF
date: "2024-09-04"
tags: [eBPF, kernel]
description: "eBPF is a technology to dynamically program the kernel for efficient networking, observability, tracing, and security"
permalink: posts/{{ title | slug }}/index.html
author_name: Anirudh Sudhir & Navneet Nayak
author_link: "https://github.com/homebrew-foss/eBPF-workshop"
---

eBPF is a technology that’s being used for tracing, networking, security, and observability in innovative ways. Let’s learn about how you can give your kernel superpowers using eBPF!

Link to the repository containing all of the workshop and post-workshop resources: [https://github.com/homebrew-foss/eBPF-workshop](https://github.com/homebrew-foss/eBPF-workshop)

---

# Prerequisites

**Please ensure that you download and setup the necessary prerequisites before attending the workshop.**

This workshop requires participants to use Linux. You may either run Linux on a bare machine or use a virtual machine (VM). It is **highly recommended** to use a VM over solutions such as Docker containers.

You may use your preferred Linux distribution or follow the guide below to setup an Ubuntu Server 24.04 LTS VM. The eBPF setup guide specifies instructions for distributions using `apt`, which may be modified for other package managers.

An alternative option is to use the cloud virtual machines provided by Isovalent as part of their labs ([https://isovalent.com/labs/ebpf-getting-started/](https://isovalent.com/labs/ebpf-getting-started/)). Setup and usage instructions can be found below. **However, we highly recommend that you setup a VM on your personal device over using the cloud VM**.

## Windows / Linux

Setting up an Ubuntu Server Virtual Machine(VM) using Oracle VirtualBox on Windows or Linux:

1. Download and install VirtualBox ([https://www.virtualbox.org/wiki/Downloads](https://www.virtualbox.org/wiki/Downloads)) by choosing the appropriate platform.
2. Download the Ubuntu Server 24.04 LTS disk image ([https://ubuntu.com/download/server](https://ubuntu.com/download/server)).
3. Open VirtualBox and select the `New` option. Set a name for the VM and the path to the ISO downloaded in the previous step. Select the `Skip Unattended Installation` option and click `Next`.
4. Choose the memory and number of processors for the VM and select `Next` . A minimum of 3GB RAM and 2 CPUs are recommended.
5. Select the `Virtual Hard Disk Now` option, specify the amount of disk space required, select the `Pre-allocate Full Size` option and click `Next`. A minimum of 10GB is recommended.
6. Check if the configuration is accurate and select `Finish` .
7. Once the VM has been created, select and start it. Select the `Try or Install Ubuntu Server` option using the arrow and enter keys and wait for the installation to complete.
8. Select the desired `Language` and `Keyboard` and continue. Select the non-minimized `Ubuntu Server` as the base for the installation. Proceed to the `Network Comfiguration` and `Proxy` sections.
9. Wait for the mirror tests to complete and continue. You may proceed with the default Storage Layout. Continue with the installation step.
10. Set the username, password and other fields. Skip Ubuntu Pro and select the OpenSSH installation. Skip the other snap installations and continue.
11. Once the installation completes, select the `Reboot Now` option. Press Enter if an error appears asking for the removal of the medium.
12. After the VM restarts, press Enter after `END SSH HOST KEYS` is displayed on the screen.
13. Enter the username, enter and repeat the same for the password.
14. Use `poweroff` to turn off the VM.

---

## macOS

Setting up an x86-64 Ubuntu Server Virtual Machine(VM) using Lima([https://lima-vm.io](https://lima-vm.io/)):

1. Install `brew`, if not already present, using the following command:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)”
```

2. Run `brew version` in the terminal to confirm a successful installation.
3. Install lima by running`brew install lima`.
4. Create the virtual machine. Select `Proceed with the current configuration` to install an Ubuntu Server 24.04 LTS image:

```bash
limactl create --arch=x86_64 --name=<insert_the_name_here_without_the_angular_brackets>
```

5. Start the VM and attach to its shell:

```bash
limactl start <name_of_the_vm_without_angular_brackets>
limactl shell <name>
cd
```

6. Use Ctrl+D to exit the VM shell and run the following command to stop the VM:

   ```bash
   limactl stop <name>
   ```

---

## eBPF Toolchain Setup Guide (To be run in the VM/Ubuntu bare machine)

For non -`apt` distributions, replace the `apt` install and update commands with the suitable package manager.

Update the VM after logging-in:

```bash
sudo apt update
sudo apt upgrade
```

1. Create a new folder to store the cloned repositories and builds:

```bash
cd
mkdir ebpf-workshop
cd ebpf-workshop
```

2. Install the necessary tools and dependencies:

```bash
sudo apt install gcc clang make llvm
```

3. Install the `libbpf` library:

```bash
sudo apt install libbpf-dev
```

4. Clone the `bpftool` repository, build and install it:

```bash
#dependencies
sudo apt install libz-dev libelf-dev libcap-dev binutils-dev

git clone --recurse-submodules https://github.com/libbpf/bpftool.git
cd bpftool/src
sudo make install
export PATH="$PATH:$(pwd)"

cd ../..
```

---

### Alternative to the above prerequisites

As an alternative, participants can use the virtual machines provided by Isovalent as part of their labs. While this is an easier option with minimal setup, we encourage setting up a VM on your personal device instead.

1. Visit the Isovalent labs page ([https://isovalent.com/labs/ebpf-getting-started/](https://isovalent.com/labs/ebpf-getting-started/)) and register to access the lab VM.
2. Change directories and install the `libbpf-dev` package:

```bash
cd ../..
mkdir workshop
cd workshop

apt install libbpf-dev
```

3. The VM is now ready for use! To create and edit files, you may use `Vim` or `Nano` . To create a file named `hello.c` with `nano` , run:

```bash
nano hello.c
```

You may now type in the active buffer. To save and exit, press `Control` and `X` (`Ctrl + X` ). Nano will ask if you want to save the modified buffer. Enter `Y` . It then prompts you for the file name. Enter a filename (or use the default name) and `Enter` to save the file.

---

# Introduction

Before we begin, we’d like to mention that this article is an introduction to the world of eBPF. It is imperative that you explore eBPF and its associated topics on your own. If you’re curious about anything mentioned here, just search about it to learn more. A great starting point would be all the links to the research papers, websites and books linked in this article. Happy learning!

**eBPF** stands for the **_extended_** Berkeley Packet Filter. Since the name implies that it is an extension of the Berkeley Packet Filter (BPF), it only makes sense that we understand what BPF is first. To do that, let’s,

### Rewind back to 1992

The 1990s, a time of tremendous technological innovation and progress that began reshaping the world. With the advent of the internet, new challenges emerged, including the need for effective packet filtering. This need arose from the necessity to protect systems from malicious actors and manage network traffic more efficiently. Let’s take a brief look at the state of network packet filtering back then.

Most packet filtering tools ran in the userspace of a machine, meaning that any packet received would have to be copied from the kernel-space to the userspace where applications would filter them.

The userspace packet filtering applications needed to make system calls to the kernel to perform almost any operation such as reading packets. Needless to say, this method was extremely inefficient and slow.

![Userspace packet filtering](https://imgur.com/j6pg93W.png)

1. Filtering was very slow due to packets being copied to user space. Filtering applications had to issue system calls to perform actions on the packet.
2. Limited flexibility with respect to setting filters, providing very little customisation.
3. Many CPU instructions were required to filter even a single packet.

Note: Packet filters for UNIX systems that used the STREAMS and NIT frameworks provided by the UNIX kernel functioned like this.

---

#### The `userspace` and `kernel`

![The userspace and kernel](https://imgur.com/I8KIyiQ.png)

A computer usually comprises of application software (such as games, browsers) and the hardware on which they run. The hardware and application software do not directly interact with each other. Instead, the software running in the `userspace` utilises system resources by interacting with the kernel, an intermediate layer between applications and hardware, which acts on its behalf. The applications interact with the kernel via the `system call` interface to perform operations such as reading memory, writing to disk or sending data over a network. This means the kernel of a system has direct access to the hardware, making any program running in the kernel much faster than code run in user space. This also makes the kernel a vantage point to monitor or modify application functionality, since most actions an application performs must go through the kernel.

---

### In comes BPF!

BPF was a novel approach to filter packets **completely in the kernel**!

Steven McCanne and Van Jacobson at the Lawrence Berkeley Laboratory came up with the BSD Packet filter in 1993. It was introduced to Linux in 1997, in kernel version 2.1.75, as the Berkeley Packet Filter (BPF).
BPF was the first to implement a register-based filter evaluator(VM) in the kernel. The BPF virtual machine emulates a register-based CPU and has 10 registers, each with a specific role!

The BPF virtual machine has a 32-bit instruction set similar to assembly which allows for defining complex filters easily and with immense flexibility. For instance, these are the BPF instructions to filter out any packets not using the Internet Protocol(IP):

```nasm
ldh     [12]
jeq     #ETHERTYPE IP, L1, L2
L1:     ret     #TRUE
L2:     ret     #0
```

These instructions run in the BPF virtual machine and can be efficiently converted to native machine code, sandboxed from the kernel. BPF showed huge improvements in speed over existing solutions and provided greater flexibility to write custom programs for filtering.

- It filtered packets in the kernel, thereby eliminating the overhead of context switching as well as copying the packet across the userspace and kernel.
- It ran instructions in a register-based virtual machine (which was around 20 times faster than packet filtering solutions like CSPF, which was a stack-based VM packet filter)

This led to the widespread adoption of BPF, in famous tools like `tcpdump`). The original BPF paper ([https://www.tcpdump.org/papers/bpf-usenix93.pdf](https://www.tcpdump.org/papers/bpf-usenix93.pdf)) is a great read to learn more about the thought process behind designing BPF. It mentions existing solutions such as STREAMS NIT packet filters and another stack-based VM packet filter called CSPF, and how BPF was a far more efficient approach to filtering.

---

## eBPF

eBPF stands for `extended Berkeley Packet Filter`. While the name might imply that it is just a faster and more efficient extension to BPF, it is slightly misleading, since eBPF can do so much more! Imagine taking the BPF virtual machine, it’s instruction set and running BPF programs anywhere in the kernel! The possibilities are truly endless.
eBPF does exactly that. It takes the core features of BPF, but extends BPF to beyond just packet filtering. eBPF programs can be attached to various kernel hooks, probes in kernel functions, and tracepoints in the kernel.

**_eBPF programs can be executed almost anywhere in the kernel!_**

You can think of eBPF as a mini computer running anywhere in the kernel, executing user code at lightning fast speeds.

![eBPF programs in the kernel](https://imgur.com/ZOtVQP1.png)

---

### Hooks

As the name suggests, kernel `hooks` are used to hook programs to some part of the kernel. eBPF is event-based and a program is executed whenever an event occurs.

There are various types of eBPF hooks, ranging from networking-specific hooks like `socket_filter` and `xdp`, to more general hooks that can be used to attach to any kernel function, like `kprobes` and even `tracepoints`, which are marked locations in the kernel code. Some of these hooks, like `kprobes` and `tracepoints`, have existed well before BPF (You can learn more about them here: [https://docs.kernel.org/trace/](https://docs.kernel.org/trace/tracepoints.html))

You can find the full list of eBPF program types by running the command

```bash
sudo bpftool feature list_builtins prog_types
```

---

eBPF can be used for a variety of applications such as:

1. Performance tracing of pretty much any aspect of a system
2. High-performance networking, with built-in visibility
3. Detecting and (optionally) preventing malicious activity

eBPF was first introduced in kernel version 3.18 in 2014, with significant improvements over classical BPF:

1. The BPF instruction set was completely overhauled to be more efficient on 64-bit machines, and the interpreter was entirely rewritten.
2. eBPF `maps` were introduced, which are data structures that can be accessed by BPF programs running in the kernel as well as user space applications, thus allowing information to be shared among them.
3. And the important part: The eBPF verifier was added to ensure that the programs are safe to run in the kernel.

![Image of the loading and verification process](https://imgur.com/CkAdwcm.png)
_Image of the loading and verification process_

As seen above, all eBPF programs go through the process of verification and JIT-compilation after which they can be attached to specific hooks. There are various libraries which provide helper functions, handle kernel interfaces and simplify the process of loading and attaching programs. Some of these include [bcc](https://github.com/iovisor/bcc) for Python, [libbpf](https://github.com/libbpf/libbpf) for C and [cilium/ebpf](https://github.com/cilium/ebpf) for Go. [Bpftrace](https://github.com/bpftrace/bpftrace) is another high-level tracing language that utilises `BCC` and `libbpf`. We will be making use of the `libbpf` library in this workshop.

---

# Programming the kernel

In the previous sections, you might have been left wondering why the eBPF virtual machine and verifier are a big deal. Why not add our own code to the kernel to run any program directly with zero overhead? Or develop Loadable Kernel Modules(LKM)? Turns out, these alternatives have their cons.

## Modifying the Kernel Source

Modifying the kernel source code is a highly challenging task. The Linux kernel has more than 30 million lines of code written over several years by thousands of contributors. Even if someone successfully edited the source to add their own functionality, there are other hurdles. Linux being a community project, all changes have to be approved by the community and specifically, Linus Torvalds. On an average, only about a third of all kernel patches are accepted, after which it is released in the next kernel version (which may take a while).

Even after jumping through all these hoops, there is no guarantee that users will be able to utilise the merged feature. Several distributions use an older version of the kernel and wait for newer versions to be thoroughly tested before releasing it.

![Comic on modifying the kernel](https://imgur.com/6qBAKCs.png)

---

## Loadable Kernel Modules

The kernel also provides for a modular approach to extend functionality by writing LKMs that can be loaded and unloaded when required. While modules do not require modifying the kernel source directly, they have their disadvantages:

1. Writing LKMs still requires significant experience with kernel programming.
2. Since any code running in the kernel is privileged, a module crash would bring the entire kernel to a halt.
3. External LKMs might have security vulnerabilities, with serious consequences due to its privileged nature.

---

## eBPF programs

eBPF provides a better alternative to program the kernel by solving the problems faced by the above approaches:

### Security

- The eBPF verifier ensures that the program is safe to run. It does this by starting from the first instruction and descending down all possible paths, while observing the state change of the registers and the stack. It also checks for unreachable instructions such as code after infinite loops. You can learn more about the verification process here: [https://docs.kernel.org/bpf/verifier.html](https://docs.kernel.org/bpf/verifier.html).
- eBPF code is run in a virtual machine with memory constraints, allowing for sandboxed execution of programs in the kernel.

### Dynamic loading

- eBPF programs can be dynamically loaded and unloaded from the kernel. It can trace current as well as older processes as soon as it attached to the appropriate hook. This is the reason behind eBPF's growing popularity in cloud-native environments, as it provides instant visibility of all processes in containers as well as the host, once it is loaded and attached.

### Ease of use and Community

- There are various eBPF-based libraries and tools which further simplify the development process and make the kernel more accessible.
- There is a growing community of developers working on the eBPF toolchain as well as using it in various applications, improving documentation and support as well as enabling faster feature development.

_The recent Crowdstrike blunder that took down servers around the world could have been avoided if a sandboxing mechanism to run kernel code was used ([https://thenewstack.io/crowdstrike-a-wake-up-call-for-ebpf-based-endpoint-security/](https://thenewstack.io/crowdstrike-a-wake-up-call-for-ebpf-based-endpoint-security/)). There is an ongoing project to bring eBPF to Windows [https://github.com/microsoft/ebpf-for-windows](https://github.com/microsoft/ebpf-for-windows)._

![Comic on simplicity of eBPF programs](https://imgur.com/b09pHb3.png)

# Let's dive in!

eBPF can be used for a variety of purposes, with the website listing case-studies of production usage [here](https://ebpf.io/case-studies/). We will cover two specific uses of eBPF in this workshop - `Observability` and `Networking`.

## Observability

### eBPF’s Hello World!

Let’s get our hands dirty and write a simple eBPF Hello World program of sorts. We’ll write a program that will print out `Hello World` every time any application makes a system call.

```c
//hello_kern.bpf.c

#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

SEC("raw_tracepoint/sys_enter")
int helloworld(void *ctx) {
	bpf_printk("Hello World!\n");
	return 0;
}

char LICENSE[] SEC("license") = "Dual BSD/GPL";
```

Note: It is completely optional to add `.bpf` to the file extension. It is usually included to easily identify `bpf` files and can be omitted, with just the `.c` extension.

Let’s understand this Hello World Program!

- First, we include the header files related to BPF from the Linux Kernel and headers from `libbpf`, the eBPF programming library we installed earlier.
- Next is the SEC macro defined by `libbpf`, which is used to define sections in the eBPF byte code after the C program is compiled. Here we pass the name of the hook we are using, so that it creates a section of that name to make it easier to load and attach the program. In this case we are using a `tracepoint`, a predefined hook that allows you to hook directly into many kernel functions. This means that our code will be executed whenever any system call related function is invoked in the kernel!
- Any function put in it’s own section by using the SEC macro is considered a BPF program. This means that it is possible to write multiple BPF programs that attach to different places in the kernel in the same C file!
- `bpf_printk` is a helper function that will log Hello World messages.
- Finally, we have the program license. Every eBPF program must specify the license it is using. It is preferred to use a `GPL` license since certain helper functions are declared as GPL. If an EBPF program with a non-GPL license utilises these functions, the verifier will not accept the program.

Now onto the next step - compiling the C program into BPF byte code. To do this, run the following command:

```bash
clang -target bpf -I/usr/include/$(uname -m)-linux-gnu -g -O2 -c hello_kern.bpf.c -o hello_kern.bpf.o
```

Here, we assume that the eBPF program file has been named `hello_kern.bpf.c` and the output object file to be generated will be called `hello_kern.bpf.o`.

The next step is to load the bpf object into the kernel and attach it to the `sys_enter raw_tracepoint`. This can be done by making use of `bpftool`, which will save us the hassle of manually writing C code to load and attach the eBPF code to the kernel.

```bash
sudo bpftool prog load hello_kern.bpf.o /sys/fs/bpf/prog autoattach
```

Believe it or not, your eBPF program is now running in the kernel, and runs everytime any system call is made by any application on your system! However, you might be wondering why there is no Hello World being printed. Since the eBPF code is running in the kernel, it isn’t directly printed to the terminal. Instead, the messages are logged to trace pipes in the kernel which can be viewed with the following command:

```bash
sudo cat /sys/kernel/debug/tracing/trace_pipe
```

We can also use bpftool to check the trace log:

```bash
sudo bpftool prog tracelog
```

That's a lot to messages being printed to the console, lets press `Ctrl + C` to stop and read the individual logs. Awesome! The sheer number of messages goes to show the amount of syscalls being made to the kernel at any given moment, which makes tracing them all the more valuable!

---

### Let’s investigate a little deeper

Now that we’ve written our first eBPF program, let’s take a step back and get our hands a little dirtier. We can check out the actual eBPF byte code and register instructions using `llvm-objdump`.

```bash
llvm-objdump -S hello_kern.bpf.o
```

This produces the following output:

```c
hello_kern.bpf.o:	file format elf64-bpf

Disassembly of section raw_tracepoint/sys_enter:

0000000000000000 <helloworld>:
;   bpf_printk("Hello World!\n"); 
       0:	18 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00	r1 = 0x0 ll
       2:	b7 02 00 00 0e 00 00 00	r2 = 0xe
       3:	85 00 00 00 06 00 00 00	call 0x6
;   return 0;
       4:	b7 00 00 00 00 00 00 00	r0 = 0x0
       5:	95 00 00 00 00 00 00 00	exit
```

- The first line tells us that this is an eBPF program.
- The subsequent lines tell us how each line of the ‘helloworld’ function in the program is translated to eBPF instructions and what they actually do on the virtual eBPF registers.
- These are the instructions being executed on the BPF virtual machine.

We can also check out the native instructions converted to assembly by the JIT compiler:

```bash
sudo bpftool prog dump jited name helloworld
```

```c
int helloworld(void * ctx):
bpf_prog_ad7f62a5e7675635_hello:
; bpf_printk("Hello World!\n");
   0:	nopl	(%rax,%rax)
   5:	nop
   7:	pushq	%rbp
   8:	movq	%rsp, %rbp
   b:	movabsq	$-114700180084464, %rdi
  15:	movl	$14, %esi
  1a:	callq	0xffffffffca5d7fb0
; return 0;
  1f:	xorl	%eax, %eax
  21:	leave
  22:	retq
  23:	int3
```

Pretty cool!

---

### Improving our hello world program

---

Right now, we're only printing “Hello World” each time a system call is made. Let’s say we want to keep track of the number of system calls an application makes on your system.

In order to do this, we’re going to make use of eBPF maps, a core new feature introduced by eBPF. These data structures allow for data storage and communication among eBPF programs as well as between eBPF programs and userspace applications.

![eBPF Maps](https://imgur.com/KNCC4uk.png)

We can define an eBPF map to keep track of the number of system calls made by each process using its PID (Process ID)

```c
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __type(key, __u32);
    __type(value, __u64);
    __uint(max_entries, 1024);
} syscall_count_map SEC(".maps");
```

This defines a bpf map of type ‘HASH’ that allows us to store key value pairs, where the keys are of 32 bit integers (which will store the respective PIDs) and values are the number of syscalls made by the particular process. Once again, we’re using the `SEC` macro to add a map section to the object file.

Now for the main counting program:

```c
SEC("raw_tracepoint/sys_enter")
int count_syscalls(void *ctx) {
    /* Helper function to get the current PID, also gets the current gid, hence
     we do a bit shift 32 bits to the right */
    __u64 pid = bpf_get_current_pid_tgid() >> 32;
    __u64 *count;

  count = bpf_map_lookup_elem(&syscall_count_map, &pid);
  if (count != NULL) {
	    // If pid already exists in the map, update the count
      *count += 1;
      bpf_map_update_elem(&syscall_count_map, &pid, count, BPF_ANY);
  } else {
	    // Otherwise initialise it to zero
      __u64 initial_count = 1;
      bpf_map_update_elem(&syscall_count_map, &pid, &initial_count, BPF_ANY);
  }

	return 0;
}
```

Here, we’re using a couple of helper functions to lookup and update values in the map, which require pointers to the map, the key, the value and an option variable, in the same order.

The complete program can be found below:

```c
//syscall_counter_kern.bpf.c

#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>

struct {
	__uint(type, BPF_MAP_TYPE_HASH);
	__type(key, __u32);
	__type(value, __u64);
	__uint(max_entries, 1024);
} syscall_count_map SEC(".maps");

SEC("raw_tracepoint/sys_enter")
int count_syscalls(void *ctx) {
	__u64  pid = bpf_get_current_pid_tgid() >> 32;
	__u64 *count;

  count = bpf_map_lookup_elem(&syscall_count_map, &pid);
  if (count != NULL) {
      *count += 1;
      bpf_map_update_elem(&syscall_count_map, &pid, count, BPF_ANY);
  } else {
      __u64 initial_count = 1;
      bpf_map_update_elem(&syscall_count_map, &pid, &initial_count, BPF_ANY);
  }

	return 0;
}

char LICENSE[] SEC("license") = "Dual BSD/GPL";
```

Next, we need to compile and attach the program, to do this we can use the same commands we used for the 'Hello World' program (the ```clang``` and ```bpftool load``` commands). Just Make sure to remove the previously attached eBPF program:

```bash
sudo rm /sys/fs/bpf/prog
```

Alternatively you can use the makefile provided in the github repository that will automatically do this compilation, by running the command ```sudo make```

We can check whether the program has been successfully loaded and attached by using the command:

```bash
sudo bpftool prog list
```

You should see something like this:

```c
72: raw_tracepoint  name count_syscalls  tag 32d619111ac61bf9  gpl
	loaded_at 2024-09-01T22:18:42+0530  uid 0
	xlated 368B  jited 210B  memlock 4096B  map_ids 22,24
	btf_id 123
```

Here, the first ‘72’ is the program id. It lists two maps associated with this program. In this example, the IDs of the maps are ‘22’ and ‘24’ respectively, which might differ on your systems. Use the map IDs to checkout the maps with the below command:

```bash
sudo bpftool map dump id 22
```

Great! Now we can see how the BPF program was able to trace the number of syscalls a process made, with each pid being listed with the corresponding number of syscalls it made.

### eBPF in Production: Observability

eBPF is being used to trace all sorts of activity on linux systems and servers across the world right now, from keeping track of application health, tracing outliers in system calls made by processes, to observing memory, CPU and power usage.

- [Kepler](https://github.com/sustainable-computing-io/kepler) tracks performance and power consumption using eBPF in conjunction with machine learning in cloud native environments.
- [Coroot](https://coroot.com/) provides application health insights via eBPF.

---

## Networking

Previously, we looked into how eBPF could be used for tracing, particularly to monitor system calls. Let's now move onto another use-case: Networking. eBPF is extensively used in networking applications for a variety of uses, ranging from load balancing to network security. There are several network-related hooks at various levels in the kernel such as the eXpress Data Path(XDP), Traffic Control (TC) and socket hooks. In this workshop, we will be attaching our programs to the XDP hook.

The XDP hook is used to process packets as soon as it arrives on a network interface and before it enters the kernel networking stack. This allows for efficient and speedy packet-processing, as the packet is not copied or transported through the kernel. eBPF programs can even be `offloaded` to supported network interface cards for faster processing. Thus, the packet routines are completed before it even enters the kernel!

XDP programs have the following general structure:

1. Intercept the packet received at the network interface
2. Read or modify the packet contents
3. Decide on a `verdict` as to what must be done with the packet, such as:
   - `XDP_PASS`: Pass the packet to the kernel networking stack as it would have in the absence of the XDP program
   - `XDP_DROP`: Discard the packet immediately
   - `XDP_TX`: Send the packet out through the same interface
   - Other verdicts include `XDP_REDIRECT` and `XDP_ABORTED`

We'll start off by writing a simple program to trace all Internet Protocol(IPv4) packets received at the network interface.

Note: All packets from `192.168.5.2` are filtered out from the trace logs. This is the loopback address of the host set by the Lima virtual machine (prerequisite for Mac users). The packets from the host to the VM clutter the trace log, hence we do not print them.

```c
#include "vmlinux.h"
#include <bpf/bpf_endian.h>
#include <bpf/bpf_helpers.h>

// 0x0800 indicates that the packet is an IPv4 packet
#define ETH_P_IP 0x0800

// Converting the IP Address to the unsigned int format to filter out Lima VM
// network packets
#define IP_ADDRESS(x) (unsigned int)(192 + (168 << 8) + (5 << 16) + (x << 24))

SEC("xdp")
int trace_net(struct xdp_md *ctx) {
  // The casting to long before void* is done to ensure
  // compatibility between 32 and 64-bit systems
  void *data = (void *)(long)ctx->data;
  void *data_end = (void *)(long)ctx->data_end;

  struct ethhdr *eth_hdr = data;
  // This check to verify that the ethernet header is contained within the
  // network packet is necessary to pass the eBPF verifier
  if (data + sizeof(struct ethhdr) > data_end)
    return XDP_PASS;

  // bpf_ntohs converts the network packet's byte order type to
  // the host's byte order type
  if (bpf_ntohs(eth_hdr->h_proto) == ETH_P_IP) {

    // This check to verify that the IP header is contained within the
    // network packet is necessary to pass the eBPF verifier
    struct iphdr *ip_hdr = data + sizeof(struct ethhdr);
    if (data + sizeof(struct ethhdr) + sizeof(struct iphdr) > data_end)
      return XDP_PASS;

    // Packet protocol values
    // 1 = ICMP
    // 6 = TCP
    // 17 = UDP

    // 192.168.5.2 is the loopback address of the host set by Lima vm
    // The packets from the host to the VM clutter the trace log, hence we do
    // not print them
    if (ip_hdr->saddr != IP_ADDRESS(2)) {

      // printk format specifier for IP addresses:
      // https://www.kernel.org/doc/html/v4.20/core-api/printk-formats.html
      bpf_printk("Src: %pI4, Dst: %pI4, Proto: %d", &ip_hdr->saddr,
                 &ip_hdr->daddr, ip_hdr->protocol);
    }
  }

  return XDP_PASS;
}

char LICENSE[] SEC("license") = "Dual BSD/GPL";

```

XDP programs start with the `xdp` section. Similar to the previous syscall tracer, the program has access to an `xdp_md` context struct that holds information about each individual packet received at the network interface.

```c
struct xdp_md {
  __u32 data;
  __u32 data_end;
  __u32 data_meta;
  /* Below access go through struct xdp_rxq_info */ __u32
      ingress_ifindex;  /* rxq->dev->ifindex */
  __u32 rx_queue_index; /* rxq->queue_index */
  __u32 egress_ifindex; /* txq->dev->ifindex */
};
```

Here, the `data` and `data_end` fields store pointers to the start and end of the packet respectively. All of the packet data is contained within this region. We parse the ethernet header from the packet, which has the following structure (Here, `be` refers to the Big-endian byte order):

```c
struct ethhdr {
unsigned char h_dest[ETH_ALEN];   /* destination eth addr	*/
unsigned char h_source[ETH_ALEN]; /* source ether addr	*/
__be16 h_proto;                   /* packet type ID field	*/
}
__attribute__((packed));
```

Before the header data is accessed, we must include checks to ensure that we do not access memory outside of the packet. In the absence of this check, the program will not be accepted by the eBPF verifier.

The `bpf_ntohs()` function converts the network packet's byte order type (usually Big-Endian) to the host's byte order type (usually Little-Endian). If the packet is an Internet Protocol packet, we then parse the IP headers and perform a similar memory-access check to prevent reading data outside of the packet.

The IP header struct defined by the kernel has the following fields:

```c
struct iphdr {
#if defined(__LITTLE_ENDIAN_BITFIELD)
__u8 ihl : 4, version : 4;
#elif defined(__BIG_ENDIAN_BITFIELD)
__u8 version : 4, ihl : 4;
#else
#error "Please fix <asm/byteorder.h>"
#endif

__u8 tos;
__be16 tot_len;
__be16 id;
__be16 frag_off;
__u8 ttl;
__u8 protocol;
__sum16 check;

__struct_group(/* no tag */, addrs, /* no attrs */,
               __be32 saddr;
               __be32 daddr;);
/*The options start here. */
};
```

We make use of the `saddr`(source address), `daddr` (destination address) and `protocol` (such as `TCP` and `UDP`) fields in this program and print them. Notice that we make use of `%pI4`, which is a format specifier used to print IPv4 addresses. Finally, we return `XDP_PASS`, indicating that the packet must be passed to the kernel as usual.

To load and attach this program, we shall use the commands from the following `Makefile`. Save the following file with the name `Makefile` in the same directory as the program. Run `sudo make` to compile, load and attach this program to the network interface.

```c
TARGET = net
INTERFACE  = eth0
ARCH = $(shell uname -m | sed 's/x86_64/x86/' | sed 's/aarch64/arm64/')

BPF_OBJ = ${TARGET:=.bpf.o}

all: $(TARGET) $(BPF_OBJ)
.PHONY: all
.PHONY: $(TARGET)

$(TARGET): $(BPF_OBJ)
	bpftool net detach xdp dev $(INTERFACE)
	rm -f /sys/fs/bpf/$(TARGET)
	bpftool prog load $(BPF_OBJ) /sys/fs/bpf/$(TARGET)
	bpftool net attach xdp pinned /sys/fs/bpf/$(TARGET) dev $(INTERFACE)

$(BPF_OBJ): %.o: %.c vmlinux.h
	clang \
	    -target bpf \
	    -D __BPF_TRACING__ \
		-I/usr/include/$(shell uname -m)-linux-gnu \
	    -Wall \
	    -O2 -o $@ -c $<

vmlinux.h:
	bpftool btf dump file /sys/kernel/btf/vmlinux format c > vmlinux.h

clean:
	- bpftool net detach xdp dev $(INTERFACE)
	- rm -f /sys/fs/bpf/$(TARGET)
	- rm $(BPF_OBJ)
```

The program logs all messages to the kernel trace pipe, which can be viewed using:

```bash
sudo cat /sys/kernel/debug/tracing/trace_pipe
```

Hurray! We see the packets and their metadata being displayed in the trace logs. To detach and unload the program from the interface, run `sudo make clean`.

### eBPF in Production: Networking

eBPF is widely used by organisations to build efficient and versatile networking systems.

- [Katran](https://engineering.fb.com/2018/05/22/open-source/open-sourcing-katran-a-scalable-network-load-balancer/) is an XDP-based Layer 4 load balancer handling every packet sent to Facebook's data centers since 2017.
- [Cloudflare](https://blog.cloudflare.com/tag/ebpf/) uses eBPF at various levels of their networking stack, including DDOS protection.
- [Cilium](https://cilium.io) is an eBPF-based networking, security and observability solution used by the likes of Google and AWS.

---

# Conclusion

We hope you had a fun time learning about eBPF! However the learning does not stop here. We have several post-workshop activities listed in the [Github repository](https://github.com/homebrew-foss/eBPF-workshop) as well as additional resources such as books, papers and labs. We highly recommend that you explore and dive in deeper. Feel free to reach out with any queries or thoughts you might want to share.

Happy hacking!

---
