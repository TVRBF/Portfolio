from fastapi import APIRouter, UploadFile, File, HTTPException
import subprocess
import tempfile

router = APIRouter(prefix="/stt", tags=["stt"])

@router.post("/whisper")
async def whisper_stt(file: UploadFile = File(...)):
    try:
        # Save temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Call whisper CLI (requires openai-whisper installed)
        result = subprocess.run(["whisper", tmp_path, "--model", "base", "--language", "en"], capture_output=True, text=True)
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=result.stderr)

        return {"transcript": result.stdout.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
