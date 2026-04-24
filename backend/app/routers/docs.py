from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlmodel import Session, select
from datetime import datetime
from app.database import get_session
from app.models import Document, DocumentCreate, DocumentUpdate

router = APIRouter(prefix="/docs", tags=["docs"])


@router.get("/")
def list_docs(session: Session = Depends(get_session)):
    return session.exec(select(Document).order_by(Document.updated_at.desc())).all()


@router.post("/")
def create_doc(doc: DocumentCreate, session: Session = Depends(get_session)):
    db_doc = Document(**doc.model_dump())
    session.add(db_doc)
    session.commit()
    session.refresh(db_doc)
    return db_doc


@router.get("/{doc_id}")
def get_doc(doc_id: int, session: Session = Depends(get_session)):
    doc = session.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    return doc


@router.patch("/{doc_id}")
def update_doc(doc_id: int, update: DocumentUpdate, session: Session = Depends(get_session)):
    doc = session.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    for k, v in update.model_dump(exclude_unset=True).items():
        setattr(doc, k, v)
    doc.updated_at = datetime.utcnow()
    session.add(doc)
    session.commit()
    session.refresh(doc)
    return doc


@router.delete("/{doc_id}")
def delete_doc(doc_id: int, session: Session = Depends(get_session)):
    doc = session.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    session.delete(doc)
    session.commit()
    return {"ok": True}


@router.get("/{doc_id}/export", response_class=PlainTextResponse)
def export_doc(doc_id: int, session: Session = Depends(get_session)):
    doc = session.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    filename = doc.title.replace(" ", "_") + ".txt"
    return PlainTextResponse(
        content=doc.content,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
