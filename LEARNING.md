# SmartFolio Learning Journal

This document tracks what I learned while building SmartFolio from scratch.

---

## Day 1: Project Setup

### What We Did
1. Created project folder structure
2. Initialized Git repository
3. Set up Python virtual environment
4. Installed core dependencies (FastAPI, SQLAlchemy, etc.)
5. Created requirements.txt to lock dependencies

### Concepts Learned

**Git**
- Git is a version control system that tracks changes locally
- GitHub hosts repositories online for sharing and backup
- `git init` creates a new repository

**Virtual Environments**
- Isolate project dependencies from global Python
- Created with `python3 -m venv venv`
- Activated with `source venv/bin/activate`
- `(venv)` in terminal prompt confirms it's active

**Dependencies Installed**
| Package | Purpose |
|---------|---------|
| fastapi | Web framework for building APIs |
| uvicorn | Server to run the FastAPI app |
| sqlalchemy | ORM for database interactions |
| psycopg2-binary | PostgreSQL driver for Python |
| python-dotenv | Load environment variables from .env files |

**Key Terminal Commands**
- `cd` - change directory
- `mkdir` - make directory
- `ls` - list files
- `pwd` - print working directory
- `source` - run a script in current session
- `which python` - show path to active Python
- `pip freeze > requirements.txt` - save dependencies to file

### What's Next
- Create first FastAPI endpoint
- Run the development server
- Set up project file structure
