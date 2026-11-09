---
title: Tilde 3.0 Bal.rs
date: "2024-10-08"
tags: [tilde-3.0, summer, mentoring, rust, systems, loadbalancer]
description: "Blog writeup for the Bal.rs load balancer project"
permalink: posts/{{ title | slug }}/index.html
author_name: Team Bal.rs
author_link: "https://github.com/homebrew-foss/bal.rs"
---

# Building a simple Load Balancer in Rust

_Authors: [Pushkar G R](https://github.com/pushkar-gr), [Pranav V Bhat](https://github.com/Prana-vvb), [Rohan Cyriac](https://github.com/rohancyriac029), [Raahithya J](https://github.com/Raahithyajayaram)_

## Why do I need a Load Balancer?
Let's say you have a few servers and are hosting a website. Great! Soon your website becomes popular and gets a lot of visitors daily. All well and good until your servers start to become overwhelmed with requests and die.
How to fix this? By putting a Load Balancer in between the clients and your servers.

A Load Balancer distributes incoming network traffic and distributes them across multiple servers to ensure no single server is overwhelmed thus optimizing reliability and resource utilization.

<p align = "center">
  <img src = "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExcnc4MmNkNGkzbDZ6ZG1icW44aG9xZGg2NjNwZmdrbG1xeWNxMmZmZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/JAC4be8Wr01Lp8dyop/giphy.gif"/>
</p>

A Load Balancer can be physical or a software. It can be further classified base on which layer of the [OSI model](https://en.wikipedia.org/wiki/OSI_model) they operate at.

As part of the [Tilde 3.0 Summer mentorship program](https://homebrew.hsp-ec.xyz/posts/history/#Tilde), the [Bal.rs](https://github.com/homebrew-foss/bal.rs) (Pronounced: `/ˈbɔːləz/`) team have built a simple L7 Load Balancer in Rust. Rust was chosen due to it's performance and safety while provding low level control over the system.<hr/>

## Getting started with Bal.rs
### Prerequisites
- [**Rust compiler**](https://doc.rust-lang.org/book/ch01-01-installation.html)
- [**Cargo package manager**](https://doc.rust-lang.org/book/ch01-01-installation.html)

### Building the Application Locally
Clone the [repository](https://github.com/homebrew-foss/bal.rs) and build the application using `cargo`.
```sh
git clone https://github.com/homebrew-foss/bal.rs
cd bal.rs
cargo build
```
For a production-ready build, you can use:
```sh
cargo build --release
```
<hr/>

### Using the Application
After building, the main executable will be located in `/target/debug` or `/target/release` based on the build command used.
Navigate to the directory and type
```sh
Balrs help start
```
in the terminal to get a list of available commands.

Alternatively, from the root directory of Bal.rs, you can use:
```sh
cargo run help start
```
for the same result.

While you can configure the Load Balancer using the command line interface, more configuration options are available through the `config.yaml` file and multiple different config files can be created.  
This feature enables the use of various configuration profiles without altering the original configuration. The desired profile can be specified through the CLI.<hr/>

## Technical Details
> Note that this section covers only the `lb.rs` file which contains the actual Load Balancing code.

There are 3 key components of our Load Balancer:
- **Listener**: Listens for incoming HTTP requests.
- **Routing**: Does the actual load balancing by forwarding the client request to the servers.
- **Fault Tolerence**: Makes sure the Load Balancer handles any faults gracefully.

### Listener
We have used Rust's [`tokio`](https://tokio.rs) crate to handle asynchronous processing and the [`hyper`](https://hyper.rs) crate for networking. Tokio's `TcpListener` is used to listen for incoming connections
<p align = "center">
  <img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/Listener.png"/>
</p>

In this code snippet, we create a `TcpListener` instance to listen for incoming traffic and set it to listen on the address of the Load Balancer.  
If the listener is bound to the Load Balancer successfully, we return the listener object for passing incoming requests to the `handle_request` function or else the error encountered is displayed.<hr/>

### Routing the Connections
There are 3 functions dealing with client requests.

1. Handling incoming requests: `handle_request` function
   <p align = "center">
     <img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/Handle.png"/>
   </p>

   We lock the `LoadBalancer` instance to access the server list and filter out any dead servers.  
   The function then tries to pass the request to the `get_request` function. If this fails, a message is logged and the loop restarts.
   If there are no available servers, a HTTP 500 response is returned.
   
   This is a dynamic fault tolerence system that reroutes an incoming request to a different server if one server is not available.
   <p align = "center">
     <img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/FaultFlow.png"/>
   </p>

2. Forwarding requests to server: `get_request` function
   <p align = "center">
     <img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/Get1.png"/>
   </p>

   Gets indexes of the servers and selects the server to be used according to the specified algorithm.
   <p align = "center">
     <img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/Get2.png"/>
   </p>

   Here, the server URL is constructed. Requests are then forwarded to the server using the `send_request` function.
   Along with that, a timer is started to measure server response time. The server response is stored in the `data` variable.
   <p align = "center">
     <img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/Get3.png"/>
   </p>

   Here, we handle variants of the server response. If we get a successful response, we return the response data or else mark the corresponding server as dead and return `None`.

3. Retrieve server response: `send_request` function
   <p align = "center">
     <img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/Send1.png"/>
   </p>

   Parse the URL from the request and extract host and port from it. The port defaults to 80 if not specified.
   Then format the address to a string for a TCP connection.
   <p align = "center">
     <img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/Send2.png"/>
   </p>

   Establish a TCP connection to the formatted address and wrap it in a tokio IO adapter so that it can be used with `hyper`.  
   A `hyper` client is then initialised using a HTTP/1 handshake.
   <p align = "center">
     <img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/Send3.png"/>
   </p>

   The HTTP request is prepared with the given URL and `HOST` header and sent using the `hyper` client.
   <p align = "center">
     <img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/Send4.png"/>
   </p>
   
   The server response body is then collected in chunks and appended to `full_body`. The complete response is then converted to `Bytes` and returned.<hr/>

### Fault Tolerence
This is a slightly large piece of code that ensures smooth functioning of the Load Balancer. So, let's break it down.
   <p align = "center">
     <img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/Health1.png"/>
   </p>
   
   Here, we create variables to store the required configuration values and clone a `LoadBalancer` instance for further use.
   <p align = "center">
     <img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/Health2.png"/>
   </p>

   Spawn an asynchronous tokio task for the health checker and create a vector to hold other tokio tasks.  
   Each task corresponds to the health check for each server. This is done to ensure all health checks happen simultaneously.
   We create the required number of tasks using a for loop where `len` is the number of servers listed in the Load Balancer's configuration.

   Inside the task for each server, we retrieve and update relevant server data.
   <p align = "center">
     <img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/Health3.png"/>
   </p>

   Using `Instant::now()` and calling `.elapsed()`, we record the server response time. We check if the server is responding by sending a `GET` request to each server with a set timeout and then update the server response time.  
   The subtraction from `lb.servers[index].connections` is done as to not count the connection opened by the health checker.
   <p align = "center">
     <img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/Health4.png"/>
   </p>

   This `match` block is used to handle the result of the HTTP request sent by the health checker.  
   If the HTTP request is completed sucessfully, we check if the response is an error code(like 404) or if the maximum connections limit is exceeded. This leads to marking of a server as dead and will not be used by the Load Balancer until it is checked again and marked as alive by the health checker.

   This marks the end of the Health Checker. After this, all the server tasks are awaited on to be periodically executed.  
   Here is a simple flowchart of how the health checking process works:
   <p align = "center">
     <img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/HealthFlow.png"/>
   </p>

   Health checker reports as displayed in the terminal:
   <p align = "center">
     <img src = "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGkyeTM3eHAxdTB0aDVlcmwzN3Mwd3RxdnJ0N2IzYzl1NDlyN2JlYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/psU5B2R73mbf6YlMha/giphy.gif"/>
   </p><hr/>

## Benchmarks
We conducted several tests at different request rates per second (RPS).<hr/>
<img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/20K.png"/>
<p align = "center"> Throughput VS Time at 20,000 RPS </p><hr/>

<img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/25K.png">
<p align = "center"> Throughput VS Time at 25,000 RPS </p><hr/>

<img src = "https://raw.githubusercontent.com/Prana-vvb/Bal.rs-Blog/refs/heads/main/Screenshots/27K.png"/>
<p align = "center"> Throughput VS Time at 27,000 RPS </p>

The tests had to be stopped here due to our hardware limitations but the trends we observed show us that the Bal.rs Load Balancer can handle much higher loads.<hr/>

## Experiences
> This is a compilation of experiences shared by the Bal.rs mentees

*"I decided to explore the field of networking during my vacation and wanted to work on some interesting projects. That's when I got involved with Tilde, working with creating a Layer 7 Load balancer using Rust. We started off in a simple way, getting familiar with Rust, and I quickly found myself enjoying the process. We had a bit of friendly competition within the team as we chose which layers to work on, ultimately developing basic versions of both Layer 4 and Layer 7 load balancers. As we progressed, we moved on to creating a full-fledged Layer 7 load balancer. The challenges we encountered pushed me to think from different perspectives, greatly enhancing my experience. The team's (mentors and peers) support and encouragement made it easy for me to collaborate effectively, making the entire journey both exciting and deeply engaging. I am happy to have worked with such a team."* - [**Raahithya J**](https://github.com/Raahithyajayaram)

*"Building a load balancer in Rust over 4 weeks was my first deep dive into Rust, async programming, Hyper, and backend development. It was challenging yet rewarding, teaching me about concurrency, memory safety, and efficient traffic management. This project laid a solid foundation for future backend endeavors."* - [**Pushkar G R**](https://github.com/pushkar-gr)

*"During the TILDE project, I collaborated on developing a user-friendly Load Balancer in Rust with multiple functionalities. This experience taught me valuable lessons in collaboration and problem-solving. It was enriching, as I met knowledgeable peers and seniors who inspired me to strive for more. Our mentors and seniors were incredibly supportive, providing valuable input for project improvements. I’m grateful to HSP for this opportunity."* - [**Rohan Cyriac**](https://github.com/rohancyriac029)

*"This project came as a very pleasant surprise to me, as I had not applied for it. Learning a completely new language while working on a rather complicated project was very challenging indeed but also very satisfying. I got to meet and work with some really great people, and their support made the learning curve much smoother. In the end, the experience was truly memorable and I learned a lot"* - [**Pranav V Bhat**](https://github.com/Prana-vvb)<hr/>

## Next Steps and Resources
- [Rust essentials](https://www.rust-lang.org/)
- [Asynchronous Programming in Rust using Tokio](tokio.rs/tokio/tutorial/async)
- [Basics of Load Balancing Algorithms](https://samwho.dev/load-balancing/)
- [Another Rust Load Balancer](https://github.com/another-rust-load-balancer/another-rust-load-balancer)
