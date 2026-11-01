---
title: "Tilde 5.0 Sillycon: Exploring Silicon Artwork Through RTL"
date: "2026-11-01"
tags: [tilde-5.0, summer, mentoring, digitalDesign, rtl, vga-plaground]
description: Sillycon blog
permalink: posts/{{ title | slug }}/index.html
author_name: "Team Sillycon"
author_link: "https://github.com/homebrew-foss/Sillycon"
---

# Sillycon

Exploring silicon artwork through synthesizable RTL, simulation and open source hardware tools

**Mentees**:
- [R Kiruthika Sri](https://github.com/rkiruthika11)
- [Tisya Agarwal](https://github.com/SolarPhoenix13)

**Mentors**:
- [Pranav M](https://github.com/pranav0x2212)
- [Suhas K V](https://github.com/skudlur)

---

The way most people think about digital graphics usually comes down to code executing on top of an operating system, 
sending draw calls to a CPU or a dedicated GPU. But that raised a question for us: is it possible for a microchip to draw 
art directly, without relying on a general-purpose computer processor?

That exact question gave birth to Sillycon. Instead of writing traditional software to display an image on a screen, we 
built hardware logic that generates dynamic visual artwork directly for a display.

## Try It Yourself

The projects can also be explored directly through the [Tiny Tapeout VGA Playground](https://vga-playground.com/). The 
Verilog source code is available in our repository and can be loaded into the Playground to simulate the designs and view 
their output in real time. The available inputs can then be used to interact with the animations and observe how the 
hardware logic responds.

<!-- TODO: Add a screenshot of the Tiny Tapeout VGA Playground here. -->
<img width="1919" height="823" alt="Screenshot 2026-09-29 165650" src="https://github.com/user-attachments/assets/a032792a-6e19-408d-a85f-3f753103f475" />


## Rethinking the Graphics Pipeline

When drawing graphics through the standard pipeline, a full stack of software and hardware works together behind the 
scenes. In a traditional setup, software code passes through an operating system and device drivers, gets processed by a 
CPU or GPU, gets stored in RAM, and finally reaches the display. With Sillycon, the graphics calculations are performed 
directly by hardware logic rather than by a general-purpose CPU or GPU. We wrote Verilog HDL code to describe the design, 
which can then be synthesized into hardware logic. The circuit calculates colors for every single pixel on the fly in 
real time.

<!-- TODO: Add the software-to-hardware graphics pipeline diagram here. -->
<img width="786" height="499" alt="Screenshot 2026-09-29 172043" src="https://github.com/user-attachments/assets/85551959-73d3-4f5d-93a6-2de999185fbe" />


## Designing Logic in Verilog

To describe our hardware, we used Verilog to write Register Transfer Level code. RTL does not work like standard C or 
Python, where instructions execute line by line. Instead, it describes how data flows between physical hardware registers 
and transforms through logic gates. Our implementation relies on three main pillars. First is state, which handles frame 
counters, real-time pixel coordinates, and clock dividers. Second is logic, which manages math operations, geometric 
conditions, and VGA timing rules. Third is signals, which control the hardware clock, RGB outputs, and physical button 
inputs.

## Getting the Graphics onto a VGA Display

The first thing we worked with was the VGA setup in the Tiny Tapeout VGA Playground. A display might look like one large 
picture to us, but from the hardware's point of view, it is generated one pixel at a time.

For a 640 × 480 display, the VGA timing logic keeps track of the current pixel's x and y position. This gives our graphics 
logic the information it needs to decide what should appear at that position. For every pixel, our design essentially asks:

-   Where am I? → Get the current x and y coordinates.
-   What should be here? → Use mathematical conditions to generate the required shape or pattern.
-   What color should it be? → Calculate the RGB values based on the pattern and animation.

<!-- TODO: Add the VGA pixel-generation flow image here. -->
<img width="681" height="194" alt="Screenshot 2026-09-29 165831" src="https://github.com/user-attachments/assets/58a8dd2c-054c-43b1-a20f-231889f4f273" />


The horizontal and vertical synchronization signals keep the display synchronized, while the RGB signals determine the 
color of each pixel. This changed how we thought about graphics. Instead of storing or drawing an image, we created 
mathematical rules that tell the hardware what each pixel should look like.

Once the basic VGA output was working, we could start experimenting with the coordinates to create the different shapes, 
patterns, and animations used in Sillycon.

## The Building Blocks Behind the Graphics

<!-- TODO: Add a visual illustrating the building blocks behind the graphics here. -->
<img width="464" height="293" alt="Screenshot 2026-11-01 201931" src="https://github.com/user-attachments/assets/74b8aff8-d1b2-4897-ac77-697620cb5117" />


### Shape, Coordinates and Symmetry

A useful way of generating graphics in hardware is to work with coordinates relative to a shape's center. For symmetric 
patterns, the center can be treated as (0,0), allowing the same geometry to be reused across different parts of the screen. 
Coordinates can also be mirrored when symmetry is needed.

This idea appears differently in both of our designs. The kaleidoscope uses coordinate transformations to create symmetry, 
while the evolving tiled animation uses coordinates relative to the center of each tile to repeat shapes across the screen.

### Animation and Timing

A static pattern is just the beginning. To make the artwork move, we need to keep track of time. We use frame counters 
that update with the VGA frame timing. These changing values can then be used in the graphics calculations to control 
things such as speed, size, movement, pulsation, color shifts, waves, and transitions.

This gives the graphics logic a changing value to work with, allowing a mathematical pattern to evolve over time instead of 
remaining static.

### Button Controls

The design also includes button inputs through `ui_in`. These inputs allow the artwork to respond to the user instead of 
simply playing one fixed sequence. In the kaleidoscope, the input buttons control different visual modes and speed 
settings. In the evolving tiled pattern animation, `ui_in[0]` is used to move through the different animation phases. 
This gives us a simple way to interact with the artwork while it is running.

### Generating the VGA Output

All these parts come together to determine the final color of each pixel. The graphics logic combines the shape 
calculations, animation values, and button inputs to produce the RGB signals for that pixel. These signals are sent to 
the VGA display, where they appear as real-time graphics.

Since the calculations are performed for each pixel as the display is refreshed, the patterns and animations can change 
continuously on the screen.

## Math as a Canvas: Building the Kaleidoscope

When you look at an eight-fold kaleidoscope on a display, your mind naturally assumes there is a mountain of complex 
math or an immense rendering engine running in the background. But when you are designing directly on silicon, you quickly 
realize that hardware loves symmetry. Instead of trying to calculate every single point across a 640 by 480 grid, we only 
needed to design a single one-eighth slice of the total pattern, letting pure digital logic handle the rest.

We started by breaking down the screen into symmetric regions using coordinate transformations. For basic four-fold 
symmetry, the circuit checks where a pixel is located. If it falls into the left or bottom half of the screen, the logic 
simply flips its coordinates so it mirrors directly over to the top-right quadrant. To push that to full eight-fold 
symmetry, we added a diagonal check. If the vertical y coordinate is greater than the horizontal x coordinate within that 
quadrant, the hardware reflects the pixel across the diagonal line. By feeding every incoming pixel through these basic 
comparison gates, a single, tiny triangle of mathematical logic automatically duplicates across all eight segments of the 
screen to form an intricate, seamlessly connected kaleidoscope.

Once the static geometry was solid, the next challenge was bringing the entire canvas to life. A static pattern proves the 
hardware math works, but graphics really shine when they move. To create motion without using a frame buffer, we built a 
hardware frame counter linked straight to our master clock and VGA timing signals. Every time the beam finishes drawing a 
full screen and hits the vertical refresh interval, the frame counter increments a motion offset value. By feeding this 
constantly updating offset back into our core pattern calculations, the underlying geometry alters slightly frame by frame. 
The result is a vibrant visual design that shifts, rotates, and flows smoothly across the display in real time, 
driven entirely by raw circuit timing.

<!-- TODO: Add the kaleidoscope GIF or screenshot here. -->
<img width="800" height="800" alt="final" src="https://github.com/user-attachments/assets/654efcb6-eb59-4bd9-a742-215a5810dee9" />



## Evolving Tiled Pattern Animation

Instead of creating one fixed pattern, could we make the pattern itself keep changing over time? This led to the Evolving 
Tiled Pattern Animation. The idea was simple at first: divide the VGA screen into repeating tiles and generate a shape 
inside every tile using pixel coordinates and mathematical conditions. Once that worked, we could start changing those 
calculations over time.

What started as a tiled triangle gradually turned into a full sequence: the triangles grow and move, the triangles morph 
into diamonds, the diamonds develop their own color movement, and finally the whole pattern turns into expanding ripples.

The final animation has four main phases:

`Triangles → Triangle-to-Diamond Morph → Diamonds → Ripples`

The interesting part was that we didn't build all of this at once. We started with the basic tiled pattern, then gradually 
added movement, shape changes, and new effects. Each stage raised a new question about what we could do with the same basic 
pixel-coordinate approach.

### 1. Building the Pattern Tile by Tile

We divided the screen into 80 × 80 pixel tiles. For each pixel, its screen coordinates were used to find its position 
inside the current tile. The center of each tile was treated as (0,0), giving every tile its own local coordinate system. 
From there, we calculated the horizontal and vertical distance of the pixel from the center and used their absolute values 
for the shape calculations. This meant the shape only had to be defined once, and the same geometry could be applied 
across every tile.

This was the basic building block for the entire animation. Instead of thinking about the screen as one huge 640 × 480 
image, we could focus on what should happen inside one tile and let the same calculation repeat across the screen.

<!-- TODO: Add a screenshot of the tiled triangle pattern here. -->
<img width="878" height="738" alt="Screenshot 2026-09-29 161846" src="https://github.com/user-attachments/assets/5e5487c9-20fe-4f17-89c1-78ce68b2a7d2" />


### 2. Triangle Animation Sequence

Once the tiling was working, the next question was: What can we actually build inside each tile? We started with a 
triangle. Its shape was generated by comparing the pixel's vertical position with its horizontal distance from the tile 
center. As the allowed width changes with each row, the triangular shape is formed.

Once the static triangle worked, we didn't want it to just sit there. The animation counter was used to change the 
triangle size over time, making the triangles grow and pulsate. We also added a smaller triangle inside the main one that 
continuously changes size.

Then we started experimenting with movement. A drift offset was gradually increased and added to the horizontal pixel 
position. The tile coordinates were then calculated from this shifted position, making the tiled pattern appear to move 
horizontally. A separate shifted horizontal coordinate was used for the color effect. This divided the screen into color 
bands, and as the counter changed, the bands moved across the triangles to create the rainbow effect.

At this point, the pattern was already moving, changing size, and changing color. But we wanted to push it further. What if 
the triangle itself could transform into another shape? That became the next phase.

### 3. Morphing Triangles into Diamonds

We didn't want the triangles to simply disappear and have diamonds appear in their place. We wanted the transition itself 
to be part of the animation. The column-wise offset became useful again. Different columns were given different delays, 
allowing the morph to travel across the screen rather than happening everywhere at once.

The geometry took some experimenting. The approach that worked was to keep the original triangle as the upper part of the 
diamond and gradually grow another triangle from the bottom to form the lower half. A separate morph counter controls this 
growth. As the morph progresses, the bottom triangle grows until it meets the original triangle and forms a complete 
diamond. After testing the morph separately and adjusting its timing, the transition worked across the tiled pattern.

<!-- TODO: Add the triangle-to-diamond morph GIF here. -->
<img width="820" height="302" alt="Recording 2026-09-29 181305-2" src="https://github.com/user-attachments/assets/3eace7c5-6c0a-45b3-9459-a60b3ea062c1" />


### 4. Making the Diamonds Evolve

After the morph, the animation continues with diamonds generated using Manhattan distance from the center of each tile:

`d = |x| + |y|`

Points with the same distance form a diamond-shaped boundary, giving a simple way to generate the shape. The diamonds 
were then made to pulsate by changing their size with the diamond counter. The same Manhattan distance was reused for the 
color effect. Different distance ranges were assigned different colors, and as the counter changed, these ranges moved 
outward from the center. This allowed the same distance calculation to control both the diamond shape and its color movement.

<!-- TODO: Add the diamond color-wave GIF here. -->
<img width="816" height="322" alt="Recording 2026-09-29 181738" src="https://github.com/user-attachments/assets/9c43ca65-d4dd-4a76-99a2-3e35a5f88ebe" />


### 5. From Diamonds to Ripples

For the final stage, we wanted to move from diamonds to circular ripples expanding across the tiles. An exact circular 
distance would require more complex hardware calculations, so we used an approximation:

`d = max(|x|, |y|) + (min(|x|, |y|) / 2)`

This uses absolute values, comparisons, and simple arithmetic to produce an approximate distance from the center. Pixels 
with similar distance values form roughly circular rings. A separate ripple counter controls the timing, while the ripple 
radius gradually increases. Three rings with different radius offsets are generated, producing the final expanding 
ripple effect.

<!-- TODO: Add the ripple GIF here. -->
<img width="822" height="308" alt="Recording 2026-09-29 182203" src="https://github.com/user-attachments/assets/a50da2fc-f7cf-435e-9eb8-cb56ef3f401b" />


### 6. Bringing the Four Phases Together with an FSM

Once we had the different animation phases working, we needed a way to control which phase was currently being displayed. 
For this, we used a Finite State Machine (FSM). An FSM is basically a way of dividing a design into different states. 
The circuit is in one state at a time, and depending on the input, it can move from one state to another.

The 2-bit phase register represents four states:

-   `00` → Triangle
-   `01` → Triangle-to-Diamond
-   `10` → Diamond
-   `11` → Ripple

The button connected through `ui_in[0]` moves the design to the next state. The button press is detected by comparing the 
current input with its previous value, preventing the phase from changing repeatedly while the button is held. The current 
phase then tells the graphics logic which set of calculations to use. This keeps the four animation stages separate while 
allowing them to work together as one design. The FSM also helped keep the project organized. Instead of putting all the 
different animation conditions together in one large block, each state has a clear purpose.

Testing the phases separately was important before combining them. It made it easier to identify whether a problem came 
from the shape calculation, animation timing, color calculation, or the transition between phases. In the end, all four 
phases worked together as one hardware-generated animation.

## What We Learned

One of the biggest things this project showed us was that hardware can be used for much more than traditional computation 
and control logic. Simple ideas like coordinate transformations, counters, and distance calculations can be combined to 
create complex-looking graphics without storing an image or animation frames. We also learned that making something look 
right is very different from simply making the RTL compile. Small changes to coordinates or timing could completely change 
the visual result, so testing and iteration became a big part of the process.

Overall, the project gave us a practical way to understand pixel coordinates, VGA timing, tiling, animation, geometric 
calculations, and hardware-generated graphics by actually using them together.

## From RTL to Real Chips

Sillycon started as an experiment in making something fun with hardware. The next step is to take the Verilog designs 
further through the ASIC flow and towards physical silicon. Building Sillycon showed us that digital hardware is not just 
meant for heavy numerical computation. With the right combination of simple mathematics, timing, and logic, it can also 
become a creative canvas for generating artwork directly from hardware.




