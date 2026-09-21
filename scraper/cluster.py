"""
Option A: keyword / word-overlap topic grouping.

Approach (see README for full rationale):
  1. Tokenize each article's title + summary into lowercase, alphabetic
     "meaningful" words, stripping stop words and very short tokens.
  2. Compare every pair of articles by (a) raw count of shared meaningful
     words and (b) Jaccard similarity of their word sets. If either crosses
     the configured threshold, union them into the same cluster
     (Union-Find / disjoint-set), which correctly merges transitively
     related articles (A~B, B~C => A,B,C together).
  3. Label each resulting cluster with its most frequent shared words.

This is intentionally simple (no ML dependency) but works well for
same-day news where the same story is reported with overlapping proper
nouns and topic words across outlets.
"""
import re
from collections import Counter

from config import CLUSTER_MIN_SHARED_WORDS, CLUSTER_MIN_JACCARD
from stopwords import STOPWORDS

WORD_RE = re.compile(r"[a-zA-Z][a-zA-Z'-]+")
MIN_WORD_LEN = 3


def tokenize(text):
    if not text:
        return set()
    words = WORD_RE.findall(text.lower())
    return {w for w in words if len(w) >= MIN_WORD_LEN and w not in STOPWORDS}


class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[ra] = rb


def _similar(tokens_a, tokens_b):
    shared = tokens_a & tokens_b
    if len(shared) >= CLUSTER_MIN_SHARED_WORDS:
        return True
    union_size = len(tokens_a | tokens_b)
    if union_size == 0:
        return False
    jaccard = len(shared) / union_size
    return jaccard >= CLUSTER_MIN_JACCARD


def cluster_articles(articles):
    """
    articles: list of dicts with at least 'id', 'title', 'summary'.
    Returns: list of clusters, each a dict {label, article_ids}.
    """
    n = len(articles)
    if n == 0:
        return []

    token_sets = [tokenize(f"{a['title']} {a.get('summary') or ''}") for a in articles]
    uf = UnionFind(n)

    for i in range(n):
        if not token_sets[i]:
            continue
        for j in range(i + 1, n):
            if not token_sets[j]:
                continue
            if _similar(token_sets[i], token_sets[j]):
                uf.union(i, j)

    groups = {}
    for i in range(n):
        root = uf.find(i)
        groups.setdefault(root, []).append(i)

    clusters = []
    for indices in groups.values():
        member_articles = [articles[i] for i in indices]
        label = _label_cluster(member_articles, [token_sets[i] for i in indices])
        clusters.append({
            "label": label,
            "article_ids": [a["id"] for a in member_articles],
        })
    return clusters


def _label_cluster(member_articles, token_sets):
    if len(member_articles) == 1:
        title = member_articles[0]["title"]
        return title if len(title) <= 60 else title[:57] + "..."

    counter = Counter()
    for tokens in token_sets:
        counter.update(tokens)
    top_words = [w for w, _ in counter.most_common(4) if counter[w] > 1][:3]
    if not top_words:
        top_words = [w for w, _ in counter.most_common(3)]
    return " / ".join(w.capitalize() for w in top_words) or "Untitled Cluster"
