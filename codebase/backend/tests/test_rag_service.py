import os
import sys
import tempfile
import unittest

import fitz

workspace_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, workspace_root)

from backend.app.services.rag_service import LangChainRAGService


class RAGServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = LangChainRAGService()

    def test_ingest_pdf_bytes_extracts_paragraph_chunks(self) -> None:
        temp_pdf = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
        temp_pdf.close()

        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((72, 72), "First paragraph about quarterly revenue.\n\nSecond paragraph about growth strategy.")
        doc.save(temp_pdf.name)
        doc.close()

        try:
            with open(temp_pdf.name, "rb") as handle:
                result = self.service.ingest_pdf_bytes(
                    doc_id="doc-test",
                    file_name="sample.pdf",
                    file_bytes=handle.read(),
                )

            self.assertTrue(result["success"])
            self.assertGreater(result["chunks_created"], 0)

            chunks = self.service.retrieve_context("quarterly revenue", top_k=3, doc_id="doc-test")
            self.assertTrue(chunks)
            self.assertEqual(chunks[0]["file_name"], "sample.pdf")
        finally:
            if os.path.exists(temp_pdf.name):
                os.unlink(temp_pdf.name)


if __name__ == "__main__":
    unittest.main()
