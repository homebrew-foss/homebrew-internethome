---
title: "Tilde 5.0 muSSHroom: Terminal-native SSH chat server"
date: "2026-08-12"
tags: [tilde-5.0, mentoring, ssh]
description: muSSHroom blog
permalink: posts/{{ title | slug }}/index.html  
author_name: "Team muSSHroom"
author_link: "https://github.com/homebrew-ec-foss/muSSHroom"
---

# muSSHroom

muSSHroom is a chat server directly accessible right in your terminal, with a connection that’s set up using SSH protocol. There's no client to install, no web app to open — just enter the required `ssh` command and you’ll straight up enter a server with many other users along with you to chat with.

![image of the musshroom terminal](https://i.ibb.co/dYNXJ6L/image-2026-09-11-235957039.png)

### Give it a try
Once you've either **hosted it locally** or **hosted your own server**, joining is just:
```ssh <hostname> -p <port>```
swap in whatever host and port, and you're straight into the chat — no signup, no config.

**Mentees**:

- [Ananya Abhilash](https://github.com/twilightily)
- [Thanmay Shetty](https://github.com/Thanmay121)

**Mentors**:

- [MC Nirmal Kumar](https://github.com/NorSomething)
- [Vinaayak G Dasika](https://github.com/Delta18-Git)

---

### What's SSH? 

SSH is normally something you use to do things like run commands on a shell in a remote machine securely with no interception (unlike the case of doing the same over the internet). It is just a protocol for opening an interactive session over an authenticated, encrypted channel.

<img src="https://i.ibb.co/Kxzx7bQv/2.png" alt="Diagram showing an explanation of an ssh connection" style="max-width: 500px; width: 100%;">

To make this connection, all you'd have to do is enter a command of the form `ssh user@serverhost` where `serverhost` is domain name or IP where the required server is hosted.

You can authenticate yourself to a server in two ways, either using a password or the key pair method, which is what we used.
An SSH key pair has two parts — a public and a private key. 
The private key remains on your local computer and the public one can be given to other resources, like the server you want to connect to, for verifying that those connections are from you. 

Now imagine, could you use this secure encrypted channel to connect to a chat server?
The answer is muSSHroom :D

### Tech Stack
This entire project is written in Go! More particularly, using its [bubbletea](https://github.com/charmbracelet/bubbletea) terminal UI framework and the [WISH](https://github.com/charmbracelet/wish) framework, which is specifically made for creating SSH servers for terminal apps.

### The Elm Architecture

Since our app is interactive, we need a particular paradigm that helps us continuously update the interface according to the user’s actions. The elm architecture is exactly that. 

It works like a loop with unidirectional flow that keeps updating itself based on the event triggers it receives when the user does something. This is used mainly in functional programming and is what we use here.

This architecture is implemented with three main parts: Model, View and Update 

![Diagram showing the basic elm structure](https://i.ibb.co/dw0RVYdJ/image-2026-09-11-225112575.png)


**Model** is something that stores the current state of your program. For example, in our chat app, every user’s session model contains information about the screen they are on, their user name, their user color etc. This consistently keeps changing via the Update Method.

**Update** is a method that looks at what has happened and returns an updated model in response. For example, to make changes based on keypresses by the user, we have a switch case in our update method that detects what key was pressed, updates the user model that was passed to it and returns this updated `tea.Model`.

The **View** method is what is actually being shown on your terminal. Takes in the updated model and based on attributes of it, renders our UI with the [lipgloss](https://github.com/charmbracelet/lipgloss) library from the bubbletea framework we mentioned earlier.

### More on BubbleTea and WISH

**BubbleTea**
Again, elm architecture is what we used to build our interactive ui and the [BubbleTea](https://github.com/charmbracelet/bubbletea) framework in Go gives us the perfect platform to do that. It’s a fun, functional and stateful way to build terminal apps. 
It contains libraries like [lipgloss](https://github.com/charmbracelet/lipgloss) which is essentially just css for colours and styling, and [bubbles](https://github.com/charmbracelet/bubbles), with UI components like text input boxes etc. offering a wide range of options to design our UI.

**WISH**
Talking about wish, it’s an SSH server that allows you to make your apps accessible over SSH. It has a wide range of middlewares that allow us to define what the user can do. In our case we use its BubbleTea middleware to serve the TUI to the users.
This process is very similar to a website. You’re making an SSH app available running on a certain port and making that interface accessible to users. You have the SSH protocol backing the app which makes user authentication very easy to implement using SSH keys.


### Timeline

**Week 1** we focused on learning Go from the ground up since that’s what we were building this entire thing with.
 
**Week 2** we played around with the bubbletea library and got used to it by creating our own notes app TUI application. It had features like note saving and tabs to view multiple notes at once. This gave us a solid idea of how to work with the elm architecture and also how to implement UI components into our terminal app.

**Week 3** our task was to actually create the chat app with its basic features. We created a wish server that ran on localhost, but the app could handle multiple users, each one being able to send messages and use slash commands like /help etc.

**Week 4** we added chatrooms, users could then use /room command along with the names of the users they want in the room. This created a chatroom with a generic name with those users in it. We also added a tabs feature to be able to view all the rooms you’re in using a very similar logic to how we achieved tabs in our notes app from week 2.

And finally in **Week 5**, we added in features to make custom roomnames, delete rooms cleanly, emoji shortcoding etc and made a few bug fixes.


### The Architecture of MuSSHroom : How it works
	
![a tldr overview of the architecture](https://i.ibb.co/4ZdqP588/Screenshot-2026-08-30-152245.png)

It starts with a plain old SSH client — you running `ssh user@serverhost`. This hits the WISH middleware first, which verifies who you are before letting you into the app.

Once you're in, WISH spins up your own `tea.Program` — every connected user gets their own instance running independently. This is where our elm architecture loop lives: a Model holds your current state, rendered out into a View, i.e. what you're staring at in your terminal.

Type something or run a slash command, and that action hits `update()`. This is the function doing the real work — it talks to the Sessions map, the server's list of who's online and where their `*userSession` lives. Your `tea.Program` checks back into this same map too, like when resolving a `/room user1 user2` command.


![diagram showing how "messaging" is processed](https://i.ibb.co/zHrsHrmB/Screenshot-2026-08-30-100926-Copy.png)

User 1 sends a message, which hits their `bubbletea program UI`. That program iterates through the entire sessions slice — the same map holding every connected user — and broadcasts a `chatMsg` out to each of their programs.

This is the actual broadcast step, and it's basically the same one loop we described earlier for `update()`, just sent globally instead of staying local to one user. System messages like users joining and leaving get sent through this exact same path, just tagged as a different message type instead of a chat one.

### Running muSSHroom Yourself
 
Enough about how it works internally, here's how to actually get a server up.
 
**1. Clone the repo**
 
```
git clone https://github.com/homebrew-ec-foss/muSSHroom.git
cd muSSHroom
```
 
**2. Build it**

 You require Go 1.26.4 or newer.
```
go build -o musshroom .
```

**3. Run the server**
 
```bash
./musshroom
```
PS: the default port is 3000 this way.
 
**Want a different port?** It's currently a hardcoded constant — open `internal/server/server.go` and change:
```go
const (
    Host = "localhost"
    Port = "3000"
)
```
to whatever port you want, make sure to rebuild with `go build -o musshroom .`

**Hosting it somewhere other than your laptop**
 
 **Home box / Raspberry Pi**: run the binary, forward the port on your router, connect using your public IP or a dynamic DNS hostname.
 **Free-tier VPS**: something like Oracle Cloud's free tier, a free server provider.
 Whichever route you pick, the only real requirement is that the chosen port is reachable from outside (open in the firewall / security group), since that's the only thing a client needs to reach.
  
**4. Connect from the client side**

assuming it's already hosted on `<hostname>`
```
ssh <hostname> -p <port>
```

### Challenges we faced along the way

One thing we faced for sure was getting comfortable with the multi user SSH environment. It wasn't just the model view update loop anymore, we had to make sure all users between each SSH connections had the changes applied to their screens and also come up with an architecture that would make this possible.

We did this by using the middleware() function which runs a particular function for each user (here we use our MVU model or the `tea.Program`). We then store this in the form of a slice, which contains username as well as the pointer of said function. We then use this to make changes in each user's model.

We also had to refactor a lot each time we added a new feature, our `sessions` struct went through iterations of refactors to create rooms properly.

To manage different rooms having their own set of messages and avoiding overlap, `ChatMsg` struct was updated to carry a `roomid` field, and each user's `Update` function checks it before appending it to the respective room via the `View` function.


### Our Takeaways from working on MuSSHroom in Tilde 5.0

Throughout these five weeks at Tilde, we got super comfortable working with git, things like writing good commit messages, making decent PRs and what not, PLUS learned a new language on the way :D

We learned how to work on a codebase as a team; picking up tasks when we each had the time, getting each other up to speed about the updates made so that it’s easier to know what its doing when we work on it, and so on.

We got a solid understanding of what the SSH protocol is — it was definitely something nice to delve into.
Most importantly we had a LOT of fun working with wish and bubbletea. This framework gives us so much freedom to create such beautiful interfaces for something that’s entirely on terminal, it was indeed very fun to explore.


**That’s all from team muSSHroom :D**
We hope you find this project interesting because we definitely had fun building this. We're yet to properly host this for users to join as of now, but it's already a lot of fun trying it out solo, just open two terminal tabs and text yourself xD
