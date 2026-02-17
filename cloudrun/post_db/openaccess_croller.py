"""Utilities to scrape CVF Open Access paper titles/abstracts."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict, Optional
import json
import re
import tqdm

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://openaccess.thecvf.com"
SUPPORTED_CONFS = {"CVPR", "ICCV", "WACV"}


@dataclass(frozen=True)
class Paper:
    title: str
    abstract: str
    url: str


def build_all_paper_url(conference_name: str, year: int | str) -> str:
    """
    3. Open access上のall_paper_urlの作成

    Args:
        conference_name: One of CVPR, ICCV, ECCV, WACV (case-insensitive)
        year: e.g., 2025

    Returns:
        e.g., "https://openaccess.thecvf.com/CVPR2025?day=all"
    """
    if conference_name is None:
        raise ValueError("conference_name is required")

    conf = str(conference_name).strip().upper()
    if conf not in SUPPORTED_CONFS:
        raise ValueError(f"Unsupported conference: {conference_name}")

    year_str = str(year).strip()
    if not re.fullmatch(r"\d{4}", year_str):
        raise ValueError(f"Invalid year: {year}")

    return f"{BASE_URL}/{conf}{year_str}?day=all"


def fetch_abst_urls(all_paper_url: str, *, timeout: int = 30) -> List[str]:
    """
    4. all_paper_urlにアクセスし，各論文ごとにabstページへのurl（abst_url）を取得する．

    Each abst_url is derived from <dt class="ptitle"><a href="...">.</a>
    """
    resp = requests.get(all_paper_url, timeout=timeout)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    urls: List[str] = []

    for dt in soup.find_all("dt", class_="ptitle"):
        a = dt.find("a", href=True)
        if not a:
            continue
        href = a["href"].strip()
        if not href:
            continue
        if href.startswith("http://") or href.startswith("https://"):
            url = href
        else:
            url = f"{BASE_URL}{href}"
        urls.append(url)

    # De-duplicate while preserving order
    seen = set()
    deduped: List[str] = []
    for u in urls:
        if u in seen:
            continue
        seen.add(u)
        deduped.append(u)

    return deduped


def fetch_title_abstract(abst_url: str, *, timeout: int = 30) -> Paper:
    """
    5. 各abst_urlごとに，titleとabstractを取得

    Title: id=papertitle
    Abstract: id=abstract
    """
    resp = requests.get(abst_url, timeout=timeout)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    title_el = soup.find(id="papertitle")
    abstract_el = soup.find(id="abstract")

    title = title_el.get_text(strip=True) if title_el else ""
    abstract = abstract_el.get_text(strip=True) if abstract_el else ""

    return Paper(title=title, abstract=abstract, url=abst_url)


def collect_papers_to_json(
    conference_name: str,
    year: int | str,
    *,
    timeout: int = 30,
    max_abstract_count: int | None = None,
    output_path: Optional[str] = None,
) -> List[Dict[str, str]]:
    """
    6. すべてのtitleとabstractを取得し，jsonにまとめる．

    Returns the list written to JSON, with entries: title, abstract, url.
    If max_abstract_count is set, only the first N abstracts are collected.
    """
    all_url = build_all_paper_url(conference_name, year)
    abst_urls = fetch_abst_urls(all_url, timeout=timeout)

    papers: List[Dict[str, str]] = []

    if max_abstract_count is not None:
        abst_urls = abst_urls[:max_abstract_count]

    for url in tqdm.tqdm(abst_urls):
        try:
            paper = fetch_title_abstract(url, timeout=timeout)
            papers.append({"title": paper.title, "abstract": paper.abstract, "url": paper.url})
        except Exception as e:
            print(f"Error fetching {url}: {e}")

    if output_path is not None:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(papers, f, ensure_ascii=False, indent=2)

    return papers


__all__ = [
    "Paper",
    "build_all_paper_url",
    "fetch_abst_urls",
    "fetch_title_abstract",
    "collect_papers_to_json",
]

if __name__ == "__main__":
    # start timer
    import time
    start_time = time.time()
    
    # Example usage
    collect_papers_to_json("CVPR", 2025, max_abstract_count=None, output_path="cvpr2025_abstracts.json")
    
    # end timer
    end_time = time.time()
    print(f"Elapsed time: {end_time - start_time:.2f} seconds")

# croll
# add embedding
# post db
