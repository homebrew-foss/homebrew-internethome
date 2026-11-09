---
title: "Tilde 4.0 Prob.lm"
date: "2025-09-15"
tags: [tilde-4.0, summer, mentoring, LLMs, RAG]
description: Blog writeup for the Prob.lm, a RAG project
permalink: posts/{{ title | slug }}/index.html
author_name: "Team Prob.lm"
author_link: "https://github.com/homebrew-foss/prob.lm"
---

# Prob.lm: Building a study assistant using RAG

_Authors: [Anshul Banda](https://github.com/AnshulBanda), [Atharv Sawarkar](https://github.com/kazabiteboltiz), [Shashank A](https://github.com/ShadowMarty), [S S Adhithya Sriram](https://github.com/SS-AdhithyaSriram), [Ayushi Mittal](https://github.com/mittal-ayushi)_

## Why do we need Prob.lm?

Imagine you’re a student or researcher needing an AI assistant to help with your studies. Sounds perfect, right? But soon you discover most AI tools are cloud-based, which means your data isn't fully private and you always need an internet connection. This becomes a real problem when dealing with sensitive research or unpublished notes. What’s more, general-purpose AI models often “hallucinate”-producing plausible but incorrect information-making them unreliable for academic work.

What’s the solution? Enter Prob.lm: a privacy-focused, lightweight AI assistant that runs entirely offline on your local device.

![Flowchart](https://i.postimg.cc/hPP6MdK8/flowchart.png)

By leveraging [Retrieval-Augmented Generation (RAG)](https://aws.amazon.com/what-is/retrieval-augmented-generation/) with a powerful [language model](https://www.cloudflare.com/learning/ai/what-is-large-language-model/), Prob.lm fetches trusted information during use, providing precise, relevant, and academically reliable answers without compromising your privacy or depending on the cloud.

## Getting started with Prob.lm

### Prerequisites

- [**Python: 3.8+ (3.10 or later recommended)**](https://www.python.org/downloads/)
- [**Ollama: Required for local LLM support**](https://ollama.com/search)
- [**Git: For cloning the repository**](https://git-scm.com/downloads)

### Running Prob.lm Locally

To run Prob.lm, Clone the [repository](https://github.com/homebrew-foss/prob.lm). After cloning the repo, we recommend you create a virtual environment and then download the requirements.txt.  Once you download a LLM from ollama, you are ready to use Prob.lm.

## Technical Details: How prob.lm works

Prob.lm is built on a sophisticated RAG pipeline designed for accuracy and efficiency. Here’s a breakdown of its key components.

### 1. Document Processing and Chunking

When you upload a document, whether it's a PDF of lecture notes, a `.txt` file, or even a Python script, `prob.lm` can't just feed the entire text to the language model at once. It needs to break it down into smaller, meaningful pieces. This process is called **chunking**.

To do this, we used a `RecursiveCharacterTextSplitter`. Instead of blindly chopping up the text, this method intelligently splits it by paragraphs, then sentences, and so on. The goal is to keep related ideas and concepts together within each chunk.

Why is this so important? **Context is everything**. By keeping related content together, the AI gets a much better understanding of your material, allowing it to provide more accurate and relevant answers to your questions later on.

![Chunking](https://i.postimg.cc/1RKbpH15/Chunking.png)

```python
def _load_and_split_docs(file_paths, status):
    """Loads and splits document content into chunks for retrieval."""
    all_docs = []
    # ... (code for loading different file types)
    
    # Logic for choosing between Semantic and Recursive chunking
    if USE_SEMANTIC_CHUNKING:
        status.update("[bold cyan]Applying semantic chunking...[/bold cyan]")
        text_splitter = SemanticChunker(embeddings=embeddings)
    else:
        status.update("[bold cyan]Applying fast recursive chunking...[/bold cyan]")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        
    split_docs = text_splitter.split_documents(all_docs)
    console.print(f"[green]✓ Created {len(split_docs)} chunks from {len(file_paths)} document(s).[/green]")
    return split_docs
```

### 2. Embedding and Vector Storage

After breaking your documents into chunks, `prob.lm` needs to index them for fast and accurate retrieval. This is done by converting the text into a numerical format.

First, each text chunk is passed through the `all-mpnet-base-v2` model to create a numerical vector called an **embedding**. This vector represents the chunk's semantic meaning. All of these embeddings are then stored locally in a **ChromaDB vector store**.

This specialized database allows for lightning-fast **similarity searches**. When you ask a question, it's also converted into a vector, and ChromaDB instantly finds the most relevant text chunks from your documents to construct an answer.

![Embeddings and Vector DB](https://i.postimg.cc/NfJVnj03/Embeddings-and-Vector-DB.png)

Embeddings:

```python
# Turns text into numerical vectors (embeddings)
embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)
```

Vector Storage:

```python
# Loads the local DB and prepares it to find relevant chunks
vector_store = Chroma(persist_directory=DB_PATH, embedding_function=embeddings)
vector_retriever = vector_store.as_retriever(search_kwargs={"k": 15})
```

### 3. Hybrid Search and Reranking

To find the most accurate information for your query, `prob.lm` uses a powerful two-stage process.

First, a **hybrid search** combines two methods simultaneously:

- **Vector Search**: To understand the query's meaning and find conceptually similar text.
- **BM25 Search**: To find text with the exact keywords from your query.
    

Next, the results from this search are passed to a **cross-encoder reranker**. This model acts as a final judge, re-evaluating the top results against your original question and selecting only the **top two** most relevant chunks. This ensures the language model receives extremely focused, high-quality context to form its answer.

```python
# Combines keyword (BM25) and semantic (vector) search
ensemble_retriever = EnsembleRetriever(
    retrievers=[bm25_retriever, vector_retriever], 
    weights=[0.5, 0.5]
)
```

```python
# Uses a cross-encoder to re-evaluate and pick the top 2 results
compressor = CrossEncoderReranker(model_name=RERANKER_MODEL_NAME, top_n=2)
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor, 
    base_retriever=ensemble_retriever
)
```

### 4. Context Expansion and Answer Generation

To ensure the language model has the full picture, `prob.lm` performs a final **context expansion**.

Before generating an answer, the system finds the top-ranked chunks and automatically includes their immediate neighbors, the chunk directly **before** and **after**. This provides crucial surrounding information and continuity.

This final, expanded context allows the LLM to generate a more complete and well-informed answer, preventing key details from being missed.

```python
def expand_context(final_docs):
    """
    Expands retrieved context by including neighboring chunks from the
    original documents to provide better continuity for the LLM.
    """
    # ... code to find and add neighboring chunks ...
    
    # Iterate and add the previous, current, and next chunk
    for i, chunk in enumerate(chunks):
        if is_a_retrieved_chunk(chunk):
            for offset in [-1, 0, 1]: 
                # ... add neighbor to the final context ...
                    
    return sorted_docs
```

Finally, your question and the expanded context are sent to a local LLM (like `llama3.2:1b`) via Ollama, which generates a factually-grounded, context-aware answer.

### Challenges and Learnings

- **Optimizing Chunking:** We found that a recursive chunking approach provided the best balance of context and specificity for academic documents.
- **Efficient Local LLM Integration:** Integrating local Ollama models required careful configuration to balance performance and resource usage, highlighting the trade-offs compared to cloud APIs.
- **Improving Retrieval:** Implementing hybrid search and reranking significantly improved the relevance of retrieved documents compared to using vector search alone.

## Next Steps

We have ambitious plans for Prob.lm, including:

- **Improved UI:** Moving from a CLI to a more intuitive graphical user interface (GUI).
- **Hardware Acceleration:** Allowing users to leverage GPUs for faster processing.
- **Advanced Document Support:** Implementing OCR to extract text from images and tables within documents.
- **Agentic RAG:** Exploring more advanced agent-based systems that can perform complex, multi-step reasoning to answer questions.

## Experiences

> This is a compilation of experiences shared by the Prob.lm mentees:
>
> *"This summer, instead of a traditional internship, I focused on building projects to strengthen my LLM skills. At Tilde 4.0, hosted by HSP ECC, I worked on a study assistant using RAG and LLMs, exploring in-context learning while developing the CLI, chunking process, and embedding pipeline. The project broadened my skillset and gave me direction for future LLM work. I’m grateful to the mentors at HSP for their guidance and to my teammates for their knowledge and support."* - [**Anshul Banda**](https://github.com/AnshulBanda)
>
> *"Working on Prob.lm was an enjoyable and rewarding experience. I got to delve into retrieval-augmented generation while also learning the value of privacy-focused, local-first AI. I learned a lot, from optimizing chunking and retrieval methods to determining how to efficiently integrate local LLMs. But, aside from the technology, I really enjoyed the collaborative aspect: my mentors were extremely helpful and patient, and I learned a lot by working alongside my teammates."* - [**Ayushi Mittal**](https://github.com/mittal-ayushi)
>
>*"I had an incredible five weeks with the Tilde 4.0 project - Prob.lm, and I'm very grateful to the HSP club for this opportunity. I contributed to the core generation and embedding pipeline of a low-resource, privacy-focused RAG system. It was deeply satisfying to see our team's work result in a functional RAG that could accurately answer questions from university course materials. This experience solidified my passion for AI/ML and collaborative development."* - [**Shashank A**](https://github.com/ShadowMarty)
>
>*"I collaborated on a study guide designed to work locally without internet access, contributing to feature brainstorming, documentation, and backend research. Through this project, I was introduced to machine learning libraries, backend development, full-stack integration, and Git/GitHub. More importantly, I learned how much successful collaboration relies on communication and sustained effort. The experience highlighted areas to grow my full-stack skills, but instead of discouraging me, it motivated step-by-step improvement. Working alongside skilled teammates reshaped how I learn, emphasizing perseverance, teamwork, and continuous growth."* - [**S S Adhithya Sriram**](https://github.com/SS-AdhithyaSriram)
>
>*"Over 4 weeks at TILDE, I collaborated with the Prob.lm team to build a RAG-based study assistant. My main focus was the embedding and chunking pipeline, preparing data for efficient retrieval and integration with the model. Through research, teamwork, and valuable mentor guidance, I gained both technical and collaborative skills. I’m grateful for the experience, and proud that we delivered a functional CLI app I look forward to using for exam prep."*- [**Atharv Sawarkar**](https://github.com/kazabiteboltiz)

## Resources

- **Project Repository:** https://github.com/homebrew-foss/prob.lm
- **LangChain:** The core framework used to build our RAG pipeline.
- **Ollama:** For running large language models locally.
- **ChromaDB:** Our local vector store for embeddings.
