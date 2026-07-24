import os
import imageio_ffmpeg
import subprocess

def process_green_screen_video():
    video_path = os.path.abspath(r'packages/core/Melhore_a_qualidade_e_coloque.mp4')
    out_dir = os.path.abspath(r'apps/web/public')
    os.makedirs(out_dir, exist_ok=True)

    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    out_webm = os.path.join(out_dir, 'tzolkin-intro.webm')
    out_webp = os.path.join(out_dir, 'tzolkin-intro.webp')
    out_mp4 = os.path.join(out_dir, 'tzolkin-intro.mp4')

    print(f"Processando vídeo de fundo verde: {video_path}")

    # Chromakey filter parameters:
    # 0x00FF00 is standard bright green. similarity ~0.3, blend ~0.1 to smooth green edges (despill).
    # despill/colorkey/chromakey filter chain:
    # chromakey=color=0x00FF00:similarity=0.3:blend=0.08
    # Also crop out corner watermarks if any (e.g. 1040x560 centered or full crop).
    
    # First, let's test ffmpeg probing:
    probe_cmd = [ffmpeg_exe, "-i", video_path]
    res = subprocess.run(probe_cmd, stderr=subprocess.PIPE, text=True)
    print("Video Info:\n", "\n".join([line for line in res.stderr.splitlines() if "Stream" in line or "Duration" in line]))

    # Filter chain: chromakey=color=0x00FF00:similarity=0.25:blend=0.1,setpts=0.35*PTS,fps=60
    # VP9 WebM with Alpha channel requires -pix_fmt yuva420p and -c:v libvpx-vp9
    chroma_filter = "chromakey=color=0x00FF00:similarity=0.28:blend=0.08,setpts=0.35*PTS,fps=60"

    print("Generating transparent WebM (VP9 + Alpha)...")
    cmd_webm = [
        ffmpeg_exe, "-y",
        "-i", video_path,
        "-vf", chroma_filter,
        "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "3M",
        out_webm
    ]
    subprocess.run(cmd_webm, check=True)

    print("Generating animated WebP with transparency...")
    cmd_webp = [
        ffmpeg_exe, "-y",
        "-i", video_path,
        "-vf", chroma_filter,
        "-c:v", "libwebp", "-lossless", "0", "-compression_level", "6", "-q:v", "85", "-loop", "0",
        out_webp
    ]
    subprocess.run(cmd_webp, check=True)

    print("Generating MP4 version (for fallback)...")
    cmd_mp4 = [
        ffmpeg_exe, "-y",
        "-i", video_path,
        "-vf", "chromakey=color=0x00FF00:similarity=0.28:blend=0.08,setpts=0.35*PTS,fps=60",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16",
        out_mp4
    ]
    subprocess.run(cmd_mp4, check=True)

    print("✓ Concluído com Sucesso!")
    print(f"WebM Size: {os.path.getsize(out_webm)} bytes")
    print(f"WebP Size: {os.path.getsize(out_webp)} bytes")

if __name__ == '__main__':
    process_green_screen_video()
