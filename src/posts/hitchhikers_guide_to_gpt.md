---
title: "The Hitchhikers Guide to GPT"
date: "2026-11-11"
tags: [machine learning,deep learning, introduction, gpt, workshop]
description: Let's Learn how to build our own Mini GPT!
permalink: posts/{{ title | slug }}/index.html
author_name: Lakshit Talreja
author_link: https://github.com/LakshitTalreja
---

## What are LLMs?

Large Language Models (LLMs) are AI systems trained on huge amounts of text to understand and generate language. ChatGPT, Claude and Gemini are all LLMs. At their core, they do one thing: **predict what comes next**.

## What is GPT?

GPT stands for **Generative Pre-trained Transformer**. It's the family of models made by OpenAI. "Generative" means it produces text, "pre-trained" means it learns from lots of data first, and "Transformer" is the architecture underneath. Today we build a tiny one ourselves.

## Transformers and Attention

The Transformer is the architecture behind almost every modern LLM. Its key idea is **attention**, which lets the model look at all the words in a sentence at once and decide which ones matter most for understanding each other. You can read the original paper, *Attention Is All You Need*, in the Further Reading section.

## The Big Picture

Here is the whole pipeline we'll build:

1. Raw text goes in (the dataset)
2. A tokenizer turns it into numbers
3. Embeddings add meaning and position
4. Transformer blocks process it (attention + MLP)
5. The model predicts the next token
6. Cross-entropy measures the error, and AdamW improves the model


## Setup: Google Colab and Libraries

We use **Google Colab**, a free notebook environment with GPU access, so nothing needs installing. The libraries we import:
[Google Colab Notebook](https://colab.research.google.com/drive/1H8KQdEaVPMS_qA2BBRQPp4OxjMZJUZbd?usp=sharing)

- **math**: basic maths, like square roots
- **urllib.request**: downloads our training text from a URL
- **torch (PyTorch)**: the deep learning framework that builds and trains the network using tensors, and runs on the GPU
- **Hugging Face tokenizers**: converts text to numbers and back using BPE

## Dataset: Tiny Shakespeare

Our training data is the *Tiny Shakespeare* file, about 1 MB of plain text from Shakespeare's plays. It's raw text with no labels. The model just learns to continue the text, one token at a time.

## Byte Pair Encoding (BPE)

Computers need numbers, not words, so we **tokenize**. Two simple options exist: word-level (each word is one token) and character-level (each letter is one token). BPE sits in between:

1. Start by splitting all words into single characters.
2. Count the most frequent pair of neighbouring symbols.
3. Merge that pair into one new token and add it to the vocabulary.
4. Repeat.

Common chunks like "ing" or "the" become single tokens, and rare words still get broken into smaller pieces. That keeps the vocabulary small without losing anything.

## Model Definitions (Hyperparameters)

These settings decide the size and shape of our model:

- **Context length**: the maximum number of tokens the model can look at in one go.
- **n_layer**: the depth of the network, meaning how many Transformer blocks are stacked on top of each other.
- **n_head**: how many attention heads run in parallel inside each block.
- **n_embd**: the size of each token's vector. Here, every token becomes 128 numbers.
- **dropout**: randomly switches off 10% of values during training so the model doesn't just memorize.

## Embeddings

A neural network can't work with words directly. Raw token IDs are a poor fit too, because the numbers suggest relationships that don't exist (is token 200 "twice" token 100?). Embeddings fix this by turning each token into a vector of numbers.

## Word Token Embeddings (WTE)

Each token gets its own 128-dimensional vector that captures its meaning. Words with similar meanings end up close together, and relationships show up as directions (the classic example is King − Man + Woman ≈ Queen). The catch is that these embeddings are **static**: a word has the same vector no matter where it appears.

## Positional Embeddings (WPE)

Attention alone doesn't know word order, so "Dog bites man" and "Man bites dog" would look identical. Positional embeddings fix this by giving every position (0, 1, 2, ... 127) its own unique 128-dimensional pattern. We add it to the token embedding, so each token now carries *what it is* and *where it is*.

## Our Inputs: Shape (B, T, C)

Here's how the data flows into the model:

1. Raw text: "King Edward"
2. BPE turns it into IDs: `[102, 45]`
3. These become a tensor of shape **(B, T)**, where B is the batch size and T is the number of tokens
4. The WTE and WPE vectors are added together, then pass through 10% dropout, giving shape **(B, T, C)** where C = 128

## The Transformer Layer

Each block repeats the same recipe:

**Pre-Norm → Multi-Head Attention → Residual → Pre-Norm → Feed-Forward MLP → Residual**

Stack several of these blocks and you have the heart of GPT.

## Pre-Norm (Layer Normalization)

Layer norm keeps the numbers stable. For each token, it looks at its 128 values and rescales them to have mean 0 and variance 1. This makes training smoother, and the tensor shape doesn't change.

## Residual Connections

The input takes two paths. One goes through the attention (or MLP) layer, and the other skips it. At the end, we add them together: `Output = Input + Layer(Input)`. This way the layer only has to learn *what to add*, and information and gradients flow freely through deep networks.

## Attention

This is where tokens "talk" to each other. Each token creates three vectors:

- **Q (Query)**: what am I looking for?
- **K (Key)**: what do I contain?
- **V (Value)**: what information do I pass along?

The formula is `softmax(Q × Kᵀ / √d) × V`. In plain words: compare queries with keys to get scores, turn the scores into weights, and use them to blend the values. **Multi-head** means we run this several times in parallel, so different heads can focus on different patterns. The shape goes from `(B, T, 128)` to `(B, 4, T, 32)`, meaning 4 heads of 32 dimensions each. The heads are then joined back together and passed through a final linear layer.

## Feed-Forward MLP

After attention mixes information between tokens, the MLP processes each token on its own:

1. **Expand** the vector from 128 to 512 numbers, which gives the network more room to compute complex features.
2. **GELU** activation adds non-linearity.
3. **Contract** it from 512 back to 128, so the shape matches what the next block expects.
4. **Dropout** (10%) for regularization.

## GELU

GELU (Gaussian Error Linear Unit) is an activation function, a smooth cousin of ReLU. Without an activation, stacking linear layers would just be one big linear layer. GELU adds the non-linearity that lets the network learn complex patterns.

## Training

The model learns by repeating a loop: guess the next token, measure how wrong it was, then adjust its weights to do better.

## Cross-Entropy Loss

At every position, the model gives a probability to every token in our ~4,000-token vocabulary. Cross-entropy checks how much probability it gave to the *correct* one: `Loss = −log(p_target)`. A confident correct guess means low loss, and a confident wrong guess means high loss. Before training, the model is basically guessing randomly, so the starting loss is about **log(4000) ≈ 8.29**. If your first loss is near this number, things are working.

## Backpropagation and AdamW

**Backpropagation** works out the gradient for every weight, which tells us which direction to nudge it to reduce the loss. **AdamW** is the optimizer that then actually updates the weights using those gradients. Repeat this thousands of times and the loss goes down.

## Output

Once trained, the model can generate Shakespeare-style text by predicting one token, adding it to the input, and predicting the next. Don't expect perfect plays, but you should see the style emerge.

## How Can We Improve the Model?

Try scaling it up! Here's a bigger configuration to experiment with:

| Setting | Value |
|---|---|
| Context length | 256 |
| n_embd | 256 |
| n_layer | 6 |
| n_head | 8 |
| dropout | 0.1 |

A bigger model can learn more, but it needs more compute and training time.

## Further Reading

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762) (the original Transformer paper)
- [Language Models are Unsupervised Multitask Learners](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf) (the GPT-2 paper)
- [Positional Encodings](https://youtu.be/k86eUj4hgdc?si=tBBr8I8mnfu5ATw_)
- [Build GPT by Andrej Karpathy](https://youtu.be/kCc8FmEb1nY?si=eIR1TAJ0IKrAoVMp)

**Channels worth following:** 3Blue1Brown, Andrej Karpathy, GreenCode, GeeksforGeeks, Homebrew by HSP

---

*Don't panic, and keep building!*
