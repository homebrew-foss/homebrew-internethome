# Homebrew EC website

This repository contains Homebrew's website. For the staff members to
contribute to this repo, please follow the given instructions below to clone
this repo and setup the preview.

## Getting Started

- Clone this repository with `git clone https://github.com/homebrew-ec-foss/homebrew-internethome.git`,
- Navigate to the newly created repository on your machine.
- Install dependencies with `bun install`
- Serve the site locally with `bun dev`
- Use `bun run build` to build a production version of the site.
- You can now access the website locally by going to `http://localhost:8080` on your browser.

Note: Requires Bun (bun 1.3.1 or later) to be installed.

## Before Submitting a PR

Run these checks locally before opening a pull request:
- `bun run build`: Production build of the site
- `bun run validate-webring`: Check the webring links (only needed when `src/data/sites.json` changes)

These checks need to be run only when modifying the JS or config files:
- `bun run lint`: ESLint over all JavaScript files
- `bun run format:check`: Prettier formatting of JS and config files
- `bunx eslint --fix`: To fix lint issues
- `bunx prettier --write <file>`: To fix formatting issues

## Markdown Features

The website supports several extensions to standard Markdown for writing posts.

### GitHub-style Alerts

You can use GitHub-style alert syntax to highlight important information in your posts:

```md
> [!NOTE]
> Useful information that users should know, even when skimming content.

> [!TIP]
> Helpful advice for doing things better or more easily.

> [!IMPORTANT]
> Key information users need to know to achieve their goal.

> [!WARNING]
> Urgent information that needs immediate user attention to avoid problems.

> [!CAUTION]
> Advises about risks or negative outcomes of certain actions.
```

These are rendered as styled alert boxes in the generated website.

### Code Block Captions

Code blocks can also have captions by adding a `caption` attribute to the fenced code block:

````md
```c caption="Some C code"
#include <stdio.h>

int main() {
    printf("Hello, Homebrew!\n");
    return 0;
}
```
````

![](https://github.com/user-attachments/assets/c05caff1-fe40-4938-a264-51366f7091b7)

The caption is displayed below the code block.

This can be used with different programming languages, for example:

````md
```rust caption="A Rust example"
fn main() {
    println!("Hello, Homebrew!");
}
```
````

## What is Homebrew?

Homebrew aims to be a community of FOSS enthusiasts, as well as the one-stop
shop for those curious about and interested in FOSS. It aims to be a forum
where enthusiasts can discuss their favorite open source technologies, and
discuss them with other enthusiasts, while also keeping track of alternatives
and suggesting different software. Students can also exhibit their projects in
the "Homebrew Expo" that occurs every week, akin to the actual Homebrew.

## Who is Homebrew catering to?

Anybody who is interested in tech, and being part of a wonderful community filled with people of diverse background! 

## Why Homebrew?

We want to have a bunch of enthusiasts who are
open about their ideals as well as their software, ensuring that the free software
and FOSS message gets passed on to future generations.
We started as a small community in our college and now were branching out as Homebrew to grow this community

