from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List, Dict, Any

class PDFProcessor:
    @staticmethod
    def extract_text_by_page(file_path: str) -> List[Dict[str, Any]]:
        """
        Extracts text from PDF page by page.
        Returns a list of dicts: [{"page": 1, "text": "..."}]
        """
        reader = PdfReader(file_path)
        pages_content = []
        
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages_content.append({
                "page": idx + 1,
                "text": text.strip()
            })
            
        return pages_content

    @staticmethod
    def chunk_document(pages_content: List[Dict[str, Any]], chunk_size: int = 1000, chunk_overlap: int = 200) -> List[Dict[str, Any]]:
        """
        Chunks the page-by-page text content while preserving the source page number.
        Returns a list of chunks: [{"page": 1, "content": "..."}]
        """
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len
        )
        
        all_chunks = []
        chunk_idx = 0
        
        for page_data in pages_content:
            page_num = page_data["page"]
            page_text = page_data["text"]
            
            if not page_text:
                continue
                
            # Split the text of this page
            chunks = splitter.split_text(page_text)
            for c in chunks:
                if len(c.strip()) > 10:  # Skip empty or negligible chunks
                    all_chunks.append({
                        "chunk_index": chunk_idx,
                        "page_number": page_num,
                        "content": c.strip()
                    })
                    chunk_idx += 1
                    
        return all_chunks
