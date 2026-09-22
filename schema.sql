-- فقط جدولين، عشان ما تتغلب
CREATE TABLE IF NOT EXISTS notes (
  path TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  updated_at DATETIME
);

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(path, title, content, tokenize='trigram');

CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(path, title, content) VALUES (new.path, new.title, new.content);
END;
CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
  DELETE FROM notes_fts WHERE path = old.path;
END;
CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
  UPDATE notes_fts SET title=new.title, content=new.content WHERE path=old.path;
END;
