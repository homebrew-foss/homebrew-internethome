---
title: "Tilde 5.0 Barrel-ly-learning - Creating a model to play donkey kong using imitation learning and actor-critic reinforcement learning."
date: "2026-08-31"
tags: [tilde-5.0, summer, mentoring, ReinforcementLearning, ImitationLearning, Actor-Critic, NeuralNetworks, GameAI]
description: The Barrel-ly Learning experience blog
permalink: posts/{{ title | slug }}/index.html
author_name: "Team Barrel-ly Learning"
author_link: "https://github.com/homebrew-foss/barrel-ly-learning"
---


# Barrel-ly Learning: Teaching an Agent to Play Donkey Kong

Barrel-ly is a deep learning agent that learns to play Donkey Kong by combining imitation learning with actor-critic reinforcement learning.

**Mentor**:
- [Lakshit Talreja](https://github.com/LakshitTalreja)

**Mentees**:
- [Mayur G M](https://github.com/based-watermelon)
- [Pranavika V](https://github.com/pranavika-v)

---

Think back to the first time you booted up your favourite game.

You quickly skim through the gameplay tutorial and start controlling your character. You're terrible at first. You watch a YouTuber or a friend play and have a few 'aha' moments. You get better.

Then you reach the hardest mid game boss.

You spend the next couple of hours trying, failing, and slowly getting better after every attempt. Eventually, you reach that one playthrough where you recognize every boss movement, know the counter to each attack, and the response has almost become muscle memory. You then finally beat the boss.

If we break down what happened, the process looks something like this:

`Bad in the beginning -> watch someone better -> learn -> play repeatedly -> learn from mistakes -> fine tune the gaps -> become better.`

This is surprisingly similar to how we can train a computer to play a game.

Instead of traditional programming where almost every possible situation is hardcoded into the agent, we can allow a neural network to learn patterns from examples and eventually improve its behaviour through experience. This is essentially the idea behind Barrel-ly-learning.

## What is Barrel-ly Learning?

Barrel-ly is our attempt to teach an agent to play a simplified version of the classic Donkey Kong game using a combination of two approaches:

- **Learning from Demonstration, also known as Imitation Learning or Behaviour Cloning,** where the agent learns by observing human gameplay.
- **Reinforcement Learning:** where the agent improves its behaviour through rewards and penalties from the game environment.

Our two stage approach draws inspiration from the paper: 

["Learning to Play Donkey Kong Using Neural Networks and Reinforcement Learning" by Paul Ozkohen, Jelle Visser, Martijn van Otterlo and Marco Wiering.](https://www.researchgate.net/publication/323381766_Learning_to_Play_Donkey_Kong_Using_Neural_Networks_and_Reinforcement_Learning)

The authors combine two stages. First, they train a base game playing policy using human demonstrations. They then use an Actor-Critic reinforcement learning method to further improve the policy using feedback from the environment. The Actor learns which action to take in a given game state, while the Critic estimates the value of being in that state.

Our project can be divided into four main stages:
1. The game engine
2. Feature extraction
3. Learning from demonstration
4. Reinforcement learning 

## Building the Game environment

We set up a simplified platformer environment replicating that of DonkeyKong using Pygame.

![Game environment](https://i.ibb.co/sJRwZjsW/gameenv.png)


Our version contains:
-   1 fixed level with three lives
-   7 platforms and 6 ladders over the original's 13
-   50% chance of a barrel rolling down a ladder

Mario has: position, velocity, jumping, climbing, direction, collision detection.

The obstacle barrels have: gravity, platform movement, ladder decisions, collision.

The goal is to reach the princess at the final bridge using the available actions: `[left, right, left+jump, right+jump, Up, Down, Idle]`

## What Does the Agent Actually See?

A game looks visually obvious to a human. We can immediately recognise the player, platforms, ladders, barrels, and the final goal. A neural network cannot.

![Grids for State Representation](https://i.ibb.co/KxXhvSfc/grids.png)

A state is a numerical representation of the game at a particular point in time. This representation is achevied using:

**Local Vision Grids**

These are two 7×7 local vision grids centred around the agent.
- One to track the relative ladder position and another to track the relative barrel postion.
- These grids move along with mario
- The cells with the ladders or barrels are set to 1 and rest to 0. 
- From these grids we get a total of 98 (2*(7*7)) boolean inputs.

**Agent Tracking Grid**

A 20×20 agent tracking grid to represent the position of the agent in the game environment.
Every frame this grid yields 400 data points providing global positional context.

**Explicit features**

These features allow the model to distinguish between states that look similar spatially but required different actions.
-   Princess coordinates (x and y) for vision of the long term goal
-   Agent direction
-   `canAgentClimb`, to avoid unnecessary climb inputs.
-   `isAgentClimbing`, to avoid ground inputs while climbing.

The grids are flattened and combined with the remaining features to give us a 503-dimensional state vector to be used as input for the Neural network.

## Learning from Demonstration

Now that we have a numerical representation of the game state, the next question is:

Given this state, what should the agent do?

To get the model to decide the best possible action for a given state Sₜ we use a Behaviour Cloning model. In this, a human plays the game and for every recorded state, the action taken by the human is stored, thus forming state-action pairs. Over multiple gameplay iterations, these pairs form a dataset large enough to train the model on.

An MLP is a neural network architecture which involves mapping an input vector to an output by passing it through a series of fully connected hidden layers.

The architecture of the MLP used can be represented as follows:

![Learning from Demonstration MLP network](https://i.ibb.co/7tTTSLH0/lfdnn.png)

### Dataset

The dataset used to train this model consists of human gameplay with a win rate of 93% and a mixture of different situations such as:
 different cases of jumping over a barrel, waiting for a barrel to pass and climbing up and down a ladder when necessary.

Each 503 dimension state is paired with the action taken by the human and we store 15 of these every second in a 60 fps playthrough.

The final dataset consists of 100 games worth of state-action pairs from the human gameplay which is then used to train, validate and test the model.

### Training

**Forward Propagation:**

The input layer takes 503 raw feature values and passes it to the hidden layers: two fully connected (Dense) layers with 256 and 128 neurons, using the ReLU (Rectified Linear Unit) function where each neuron calculates a weighted sum

**z = Σᵢ wᵢxᵢ + b**

and passes it forward.

`ReLU` is a simple and efficient activation function used to find non linear patterns from the inputs. Finally, the output makes a prediction for that particular state in the form of an action.

**Backward Propagation:**

Once we have a prediction for a particular state, we use a `CrossEntropyLoss` function to calculate the loss from the actual actio taken by the human. This loss is then used to adjust the weights of the actions using an optimizer. With each training iteration, the weights are improved.

After training, validating and testing with `[90:6:4]` episodes respectively, the Behaviour cloning model is able to achieve the following performance:

[LfD Autoplay](https://drive.google.com/file/d/1IPDHaJo3_qpbsW8bfZ0kSMOPiSkB2DLv/view?usp=sharing)

## Reinforcement Learning: Learning From Experience

Behaviour Cloning was a good starting point for our agent. By training it on human gameplay, the model learned some of the basic behaviours needed to play the game, like climbing ladders, jumping over barrels, and generally moving towards the princess.

However behaviour cloning has a pretty obvious limitation, the agent can only learn from situations that are present in the demonstration games. If the agent happens to be in a new state, it does not know how to handle it. We want the agent to learn and make new strategies to win rather than just blindly imitate actions from human gameplays. 

That's where Reinforcement Learning comes in.

### Starting With What the Agent Already Knows

Instead of training the RL model completely from scratch, we use the weights learned from the Behaviour Cloning model as a starting point.
We used the trained Behaviour Cloning model to initialise the Actor-Critic network.

Hence the shared feature extractor used in the Behaviour Cloning model is kept the same:

![Shared architecture](https://i.ibb.co/HD8JL9Pj/sharednetwork.png)

The weights learned during Behaviour Cloning get copied straight into these layers, and the Behaviour Cloning model's output layer becomes the starting point for the Actor.

This means that when RL training begins, the agent already has some idea of how to play the game. It doesn't have to spend the first part of training randomly figuring out how to move, climb, or jump.

In short, instead of:

`Random Agent → Reinforcement Learning`

our pipeline looks like:

![Pipeline](https://i.ibb.co/chkjq4YL/pipeline.png)

### The Actor and the Critic

After the shared feature extractor, the network splits into two heads:

![SharedFeatureExtractor](https://i.ibb.co/dsjm5Gtc/actor-critic-head.png)

The Actor is the one deciding what to actualy do, it produces a score for all seven possible actions, runs them through Softmax layer to turn them into probability distribution, and samples one.

![Softmax](https://i.ibb.co/MxmqKk9x/softmax.png)

The Critic watches and judges, estimating how good the current state is by producing a value, V(s).

Simply put: the Actor decides what to do, the Critic decides how that action has affected the state.

### Preventing Invalid Actions

Not every action makes sense in every situation the agent obviously can't climb up or down when it isn't near a ladder, and it can't jump if it's not standing on a bridge.

To stop the agent from wasting time exploring actions that are physically impossible, we use action masking. Before converting the Actor's output into probabilities, invalid actions are assigned a very large negative value.:

```
Not near a ladder     →  Mask UP and DOWN
 Not on a bridge        →  Mask JUMP LEFT and JUMP RIGHT
```
After masking, the remaining valid actions are converted into probabilities and the Actor selects from them.

This prevents the agent from wasting exploration on actions that physically cannot work in the current state.

### The Reinforcement Learning Loop

At every step, here's what the agent goes through:

![rl_loop](https://i.ibb.co/1tKBHYwH/rl-loop.png)

The agent's still looking at the same 503-dimensional state it used during Behaviour Cloning . After an action is selected and executed, the environment gives us the next state along with a reward based on what happened. That experience is then used to update both the Actor and the Critic.

### Designing the Reward

The reward function is basically how we tell the agent "good job" or "don't do that again." Positive events should push it towards useful behaviour, and negative ones should steer it away from failure.

| Event                    | Reward            |
| ------------------------ | ----------------- |
| Score increases          | + score difference |
| Lose a life              | −100              |
| Reach the princess       | +1000             |
| Lose all lives / Game Over | −1000           |

The existing in-game scoring already rewards jumping over barrels, so the agent gets positive feedback for good gameplay on top of being penalised for losing lives or dying outright.

### Temporal Difference Learning

To update the Critic, we lean on Temporal Difference (TD) learning. The Critic estimates the value of the current state, V(s), we then compare this estimate with a target based on the reward the agent just received and the estimated value of the next state.
For a non-terminal state:

`TD Target = Reward + γV(s')`

where γ is the discount factor (γ = 0.99 used here), and V(s') is the estimated value of the next state.

If the episode ends, there's no next state to think about, so the TD target just becomes the final reward.

The gap between the Critic's prediction and this target is the TD error:

`TD Error = TD Target − V(s)`

and this single number becomes the learning signal for both the Actor and the Critic.

### Updating the Critic

The Critic's job is to get better at estimating state values, so its loss is just the squared difference between the TD target and its prediction:

`Critic Loss = (TD Target − V(s))²`

We optimise it with Adam at a learning rate of 1e-4. Over time it gets sharper at telling apart states that are heading towards success from ones heading towards failure.

### Updating the Actor

The Actor uses the same TD error to figure out whether the action it picked worked out better or worse than expected. Its loss is:

`Actor Loss = −log π(a|s) × TD Error`

where π(a|s) is the probability of picking action a in state s. If the TD error is positive, the outcome beat expectations, and that action becomes more likely in similar states going forward. If it's negative, the action's probability gets pulled down.

That gives us the core feedback loop:

`Take Action → Observe Consequence → Receive Reward → Calculate TD Error → Update Actor and Critic → Try Again`

### From Imitation to Improvement

What's interesting about stacking these two approaches is that they're solving completely different problems. Behaviour Cloning hands the agent a starting point so it doesn't have to stumble through every basic behaviour via random exploration. Reinforcement Learning then lets it go past those demonstrations - actually interacting with the environment, taking the hits and the wins, and adjusting based on its own experience.

Here's a demonstration of the agent after RL:  [RL Autoplay](https://drive.google.com/file/d/1RIJAbGHBZMCr_2wN7V5voM6OZAkGV4Z4/view?usp=sharing)

Put together, the full pipeline looks like this:

![fullpipline](https://i.ibb.co/bMNp3XzB/fullpipeline.png)



## What We Learned

Barrel-ly Learning started with a fairly simple question: can we teach an agent to play a game by first showing it how humans play?

Turns out, getting there involves a lot more than just training a neural network. Before we could even think about training, we had to build the entire system around it i.e, the game environment, movement and collisions, ladders and jumping, dynamic barrel behaviour, the state representation, the grid-based feature extraction, recording gameplay, converting it into state-action pairs, training the Behaviour Cloning model, initialising the Actor-Critic model from that pretrained policy, designing the reward function, and implementing TD learning. That, along with having to fix all major bugs the agent could capitalize on were the challenges we had to face.

The biggest lesson was just how interconnected all of these pieces are. The model's only as good as the state representation. The Behaviour Cloning model's only as good as the demonstrations it's trained on. And the RL stage lives or dies by the environment and reward structure underneath it.

## What's Next?

Barrel-ly Learning is still very much a work in progress. The Behaviour Cloning model gives the agent a starting policy grounded in human gameplay, and the Actor-Critic system lets it keep improving from there through its own trial and error.

Going forward, we want to play around with different reward structures, state representations, model architectures, and training strategies and we're curious to see just how much RL can actually improve on the original behaviour-cloned policy.

The project started with a familiar idea: getting better at a game by watching someone else, trying it yourself, failing repeatedly, and eventually learning what works. Barrel-ly Learning is our attempt to translate that process into a learning system.

The agent begins by learning from us. Then it starts learning from the game itself. And somewhere between the barrels, ladders, demonstrations, and failed runs, hopefully it learns how to beat the game.




