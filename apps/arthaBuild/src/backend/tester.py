import sys
import subprocess
from pathlib import Path

def get_project_dirs(project_name="TestSDFProject"):
    original_dir = Path.cwd()
    project_dir = original_dir / project_name
    return original_dir, project_dir

def run_command(command, cwd=None):
    """
    Run a shell command and print output.
    """
    print(f"\n$ {' '.join(command)}")
    result = subprocess.run(
        command,
        cwd=cwd,
        text=True,
        shell=True  # Important for Windows if using a string command
    )
    if result.returncode != 0:
        print(f"❌ Command failed: {' '.join(command)}")
        sys.exit(1)
    return result

def create_project(project_name="TestSDFProject"):
    original_dir, project_dir = get_project_dirs(project_name)

    if project_dir.exists():
        print(f"✅ SDF project '{project_name}' already exists at {project_dir}")
        return f"✅ SDF project '{project_name}' already exists."

    print(f"📁 SDF project '{project_name}' does not exist. Creating new project...")

    command = [
        "suitecloud", "project:create",
        "--type", "ACCOUNTCUSTOMIZATION",
        "--projectname", project_name,
        "--overwrite"
    ]

    result = subprocess.run(
        command,
        cwd=original_dir,
        text=True,
        shell=True,   # Important for Windows
        capture_output=True  # So you can print stdout/stderr
    )

    if result.returncode == 0:
        print(result.stdout)
        return f"✅ Created SDF project '{project_name}' at {project_dir}"
    else:
        print(f"STDOUT:\n{result.stdout}")
        print(f"STDERR:\n{result.stderr}")
        return f"❌ Failed to create project '{project_name}'"
    

def setup_account_ci(project_name="TestSDFProject"):
    original_dir, project_dir = get_project_dirs(project_name)

    if not project_dir.exists():
        print(f"📁 SDF project '{project_name}' does not exist. Creating...")
        create_project(project_name)

    print(f"⚙️ Setting up account for CI in {project_dir} ...")
    run_command(
        [
            "suitecloud", "account:setup",
            # "--account", "7220160_SB2",
            # "--authid", "ci_auth",
            # "--tokenid", "your_token_id",
            # "--tokensecret", "your_token_secret",
            # "--consumerkey", "your_consumer_key",
            # "--consumersecret", "your_consumer_secret"
        ],
        cwd=project_dir  # Run inside the project folder
    )
    print("✅ SuiteCloud CI account setup complete.")

def deploy_project(project_name="TestSDFProject"):
    original_dir, project_dir = get_project_dirs(project_name)

    if not project_dir.exists():
        print(f"📁 SDF project '{project_name}' does not exist. Running setup first...")
        setup_account_ci(project_name)

    print(f"🚀 Deploying project '{project_name}' from {project_dir} ...")
    run_command(
        [
            "suitecloud", "project:deploy"
        ],
        cwd=project_dir  # Run inside the project folder
    )
    print("✅ Deployment complete.")


