---  
title: Large git objects and the power of git rebase.
date: '2022-12-31'
tags: [git, rebase, gitobjects]  
description: The mystry of large git object and a working knoweldge of git rebase.
permalink: posts/{{ title | slug }}/index.html
author_name: P K Navin Shrinivas
author_link : https://github.com/NavinShrinivas
---

# Preface
`git rebase`, is a command I've heard only the true git master ninjas use. A command that baffled me for years was finally demystified! Let's first set the scene. I wanted to read some code (source code) from the site you are currently browsing, so like all programmers I went ahead and cloned the repo. It was SLOW, why? well, git was trying to clone ~150 MB of data. WHAT, why?

> Note: I had already fixed the issues, force pushed and cleared my reflog. Hence I had to rebuild the said issues, so it may seem a bit off.

## Large Objects: Why did I just clone ~150 MB?

So, typically I first did this : 
```bash
git clone git@github.com:NavinShrinivas/homebrew-internethome.git
```
> Note: The above repo is a fork of this website with this issue replicated.

And this is where we first notice something off : 
![image of large object during clone](https://imgur.com/7SrYL9o.png)

One's first guess would be large file size, so let's go in search of it : 
```bash
du | sort -n
```
![checking file size and sorting](https://imgur.com/qfoR6Oy.png)
What we instead see here is that the .git folder (something that we don't manually track) is the largest! Well, now I gotta see why is the image in the .git being so large. After googling a bit and I found this nifty script that tells which item in the repository is consuming the maximum space in the images.

```bash
git rev-list --objects --all |              
git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' |
sed -n 's/^blob //p' |
sort --numeric-sort --key=2 |
cut -c 1-12,41- |
$(command -v gnumfmt || echo numfmt) --field=2 --to=iec-i --suffix=B --padding=7 --round=nearest
```
> Note: the above command acts as 1, it doesn't hold much importance in this blog.

![image showing induvidual item in object sizes](https://imgur.com/OwtXpsZ.png)

Well well well, it's not a single file making this happen. It's a bunch of font files that are bloating the image. Phew, easy fix, let's just delete those files no? Well, if one does a `ls` on the repo, there is no folder 16/ or those files!!! That's when it occurs to me, those folders are no more part of the tracked files but git is having them tracked in previous commits (One for the addition of those files and another commit for deletion of them).

## Solution: Rebase or git filter-branch 

Before I could fix this, I need to find the commit that introduced and deleted these items. A quick GitHub search gives me what I'm looking for.
[addition commit](https://github.com/NavinShrinivas/homebrew-internethome/commit/70e96ff861b572d5a7430970bdb9fc72615d9712)
[deletion commit](https://github.com/NavinShrinivas/homebrew-internethome/commit/b37d866776e1186b2c2d46d5759d15ae7b5c6ba9)

One of the other solutions that I came across was a git filter branch that allows you to execute a command on every commit (between 2 hashes). So one could have simply removed the existence of that folder from every commit between those two.

But I went the rebase way. Now would be a good time to gain intuition on rebase. 

### git rebase 

Surprisingly, rebase has all it has to right in its name. It lets you change the base of a given branch. That is, it lets you modify the base (previous commit) keeping the head the same!

### Applying rebase 

I used an "interactive" mode for git rebase, this can be done by : 
```bash
git rebase -i hash_of_commit_you_want_to_rebase_from
```
In our case, I decided to rebase from [here](https://github.com/NavinShrinivas/homebrew-internethome/commit/886448910588f6332c665abd8af44cbca4fd7e2d)(it's the commit right behind the addition commit)

```bash
git rebase -i 886448910588f6332c665abd8af44cbca4fd7e2d
```
This opens up a nice document in your editor : 
![interactive rebase](https://imgur.com/I7HMBbu.png)
Let's save and quit this document after changing those 2 commits to edit. Git being the very elaborate tool it is stops at all those commits we've asked to edit.
![edit commit 1](https://imgur.com/B2Fkz1d.png)
Now, we can do whatever change we want, and do `git add .`. Then let's simply follow what git tells us by doing amend and continue. In our case : 
```bash
$ rm -rf 16 
$ git add .
$ git commit --amend #save and quit 
$ git rebase --continue
```
![image after first rebase fix](https://imgur.com/6ffxxka.png)
For our second commit fix, it's like we never had the folder called 16. So we don't have to do anything. Just amend and continue!
![image after rebase commit 2](https://imgur.com/xo8MITF.png)
So in theory we have entered our commit history and removed the existence of those files EVER. All we gotta do is push these changes to the remote. 
Oh, uhh. The histories are different, which implies we need to force push. This also means others have to force pull :( 

It was at this point I figured that this solution does fix my problem but is not the perfect way. Little googling tells me that there are better ways to rebase. 
Anyways, let's force push and clone again to see if our fix worked. 

## Conclusion 

```bash 
git clone git@github.com:homebrew-foss/homebrew-internethome.git
```
> Note: the repo I'm cloning here is the one that is fixed!

![clone after rebase](https://imgur.com/90C9lRB.png)
WOOT! 5 MB was our clone size and it was much faster! This goes to show, git is a powerful tool, we simply don't know what it can do. I conclude this blog with a quote by one of my friends "The best way to learn git is to need it."
