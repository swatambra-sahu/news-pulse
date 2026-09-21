"""
A standard English stop-word list plus a handful of generic news-wire
filler words (e.g. "says", "reuters") that show up constantly in headlines
but carry no topical meaning. Kept as a plain Python set so the scraper has
no runtime dependency on an NLTK data download.
"""

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an",
    "and", "any", "are", "aren't", "as", "at", "be", "because", "been",
    "before", "being", "below", "between", "both", "but", "by", "can",
    "could", "did", "do", "does", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "has", "have",
    "having", "he", "her", "here", "hers", "herself", "him", "himself",
    "his", "how", "i", "if", "in", "into", "is", "it", "it's", "its",
    "itself", "just", "me", "more", "most", "my", "myself", "no", "nor",
    "not", "now", "of", "off", "on", "once", "only", "or", "other", "our",
    "ours", "ourselves", "out", "over", "own", "same", "she", "should",
    "so", "some", "such", "than", "that", "the", "their", "theirs",
    "them", "themselves", "then", "there", "these", "they", "this",
    "those", "through", "to", "too", "under", "until", "up", "very",
    "was", "we", "were", "what", "when", "where", "which", "while",
    "who", "whom", "why", "will", "with", "would", "you", "your",
    "yours", "yourself", "yourselves",
    # generic news-wire / boilerplate filler
    "says", "said", "say", "new", "news", "report", "reports", "reported",
    "reuters", "ap", "afp", "according", "after", "amid", "over", "into",
    "video", "watch", "live", "update", "updates", "breaking", "analysis",
    "opinion", "explainer", "what", "how", "why", "world", "us", "u.s",
    "image", "images", "credit", "photo", "photos", "photograph", "getty",
    "caption", "file", "read", "more",
}
