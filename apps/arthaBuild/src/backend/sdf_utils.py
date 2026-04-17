import subprocess
import os
import sys
import shutil

# def get_project_dirs(project_name="TestSDFProject"):
#     original_dir = os.getcwd()
#     project_dir = os.path.join(original_dir, project_name)
#     return original_dir, project_dir
from pathlib import Path

def get_project_dirs(project_name="TestSDFProject"):
    original_dir = Path.cwd()
    project_dir = original_dir / project_name
    return original_dir, project_dir

def run_command(command, cwd=None):
    """
    Helper to run a shell command and print output.
    """
    print(f"\n$ {' '.join(command)}")
    result = subprocess.run(command, cwd=cwd, text=True)
    if result.returncode != 0:
        print(f"Command failed: {' '.join(command)}")
        sys.exit(1)

def create_project(project_name="TestSDFProject"):
    ORIGINAL_DIR, PROJECT_DIR = get_project_dirs(project_name)
    if os.path.exists(PROJECT_DIR):
        print(f"✅ SDF project '{project_name}' already exists at {PROJECT_DIR}")
        return f"✅ SDF project '{project_name}' already exists."

    print(f"📁 SDF project '{project_name}' does not exist. Creating new project...")
    result = subprocess.run([
        "suitecloud", "project:create",
        "--type", "ACCOUNTCUSTOMIZATION",
        "--projectname", project_name,
        "--overwrite"
    ], capture_output=True, text=True)

    if result.returncode == 0:
        return f"✅ Created SDF project '{project_name}' at {PROJECT_DIR}"
    else:
        return f"❌ Failed to create project:\nSTDOUT: {result.stdout}\nSTDERR: {result.stderr}"

def setup_account_ci(project_name="TestSDFProject"):
    ORIGINAL_DIR, PROJECT_DIR = get_project_dirs(project_name)
    if not os.path.exists(PROJECT_DIR):
        print(f"📁 SDF project '{project_name}' does not exist. Creating...")
        create_project(project_name)
    try:
        os.chdir(PROJECT_DIR)
        run_command([
            "suitecloud", "account:setup",
            # "--account", "7220160_SB2",
            # "--authid", "ci_auth",
            # "--tokenid", "f031aaec6baa2f58cb2c03529018bd008ffec525756564fcc897fe9ec1c8c365",
            # "--tokensecret", "60d3660c33c61f6a4f50c1fa70d9c2e0d63a4ce2c1354f3113132cf3fc40b36e",
            # "--consumerkey", "5518df2f82dd6fe7610e5d8f323cb5f42f27a638f86eff897716446cad6f021c",
            # "--consumersecret", "69a0483de4e5e4347d0b04d921ddd0a7c38aa0cd90f8550a56c3d9dd7e32294"
        ])
    finally:
        os.chdir(ORIGINAL_DIR)
    print("✅ SuiteCloud CI account setup complete.")

def deploy_project(project_name="TestSDFProject"):
    ORIGINAL_DIR, PROJECT_DIR = get_project_dirs(project_name)
    if not os.path.exists(PROJECT_DIR):
        print(f"📁 SDF project '{project_name}' does not exist. Running setup first...")
        setup_account_ci(project_name)
    try:
        os.chdir(PROJECT_DIR)
        run_command([
            "suitecloud", "project:deploy"
        ])
    finally:
        os.chdir(ORIGINAL_DIR)
    print("✅ Deployment complete.")

def extract_project_name(user_input):
    """
    Uses local Ollama LLM to extract project name from user input.
    Phase 3: migrated from OpenAI to ChatOllama (zero external API calls).
    """
    import os
    try:
        from langchain_ollama import ChatOllama
        llm = ChatOllama(
            model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
            temperature=0,
        )
        prompt = f"""Extract the NetSuite SDF project name from this user input:
\"\"\"{user_input}\"\"\"

If there is no project name, respond with "None".
Only return the name."""
        result = llm.invoke(prompt)
        name = result.content.strip()
        if name.lower() == "none":
            return None
        return name
    except Exception:
        return None


def handle_sdf_project(user_input, default_project_name="TestSDFProject"):
    """
    Handles creating or deploying the SDF project based on user input keywords.
    Uses local Ollama LLM to extract the project name.
    """
    user_input = user_input.strip()
    project_name = extract_project_name(user_input)
    if not project_name:
        project_name = default_project_name

    print(f"Using project name: {project_name}")

    if "create" in user_input.lower():
        create_project(project_name)
    if "deploy" in user_input.lower():
        setup_account_ci(project_name)
        deploy_project(project_name)

if __name__ == "__main__":
    create_project()
    # user_input = input("Enter command: ")
    # handle_sdf_project(user_input)
