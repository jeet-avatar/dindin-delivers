# File: suitescripts_utils.py
import re
import subprocess
import os
import shutil
import sys
from sdf_utils import create_project, get_project_dirs

def get_project_dirs(project_name="TestSDFProject"):
    original_dir = os.getcwd()
    project_dir = os.path.join(original_dir, project_name)
    return original_dir, project_dir

def download_suitescript_file(file_name, project_path="TestSDFProject"):
    """
    Downloads a SuiteScript file using SuiteCloud CLI.

    Args:
        file_path (str): Path in NetSuite File Cabinet (e.g. 'SuiteScripts/restlet_basic.js')
        destination (str): Local folder inside the SDF project
        project_path (str): Local path to SuiteCloud project
    """
    if not shutil.which("suitecloud"):
        return "❌ Error: 'suitecloud' CLI is not found in your PATH. Please install or check your PATH configuration."

    original_dir, _ = get_project_dirs()
    abs_project_path = os.path.join(original_dir, project_path)
    if not os.path.exists(abs_project_path):
        return f"❌ Project path does not exist: {abs_project_path}"

    print(f"📂 Changing directory to: {abs_project_path}")
    os.chdir(abs_project_path)

    command = [
        "suitecloud", "file:import",
        "--paths", f"/SuiteScripts/{file_name}",
    ]

    print(f"🚀 Running command: {' '.join(command)}")

    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        return "✅ File downloaded successfully.\n📨 Acknowledgement: SuiteScript file download completed."
    except subprocess.CalledProcessError as e:
        print("❌ Error importing file:")
        print("STDERR:", e.stderr)
        print("STDOUT:", e.stdout)
        return f"❌ File download failed: {e.stderr or e.stdout or 'Unknown error'}"

def extract_custom_suitescript_metadata(project_path="TestSDFProject"):
    """
    Extracts metadata about custom SuiteScripts already present in the NetSuite application
    using SuiteCloud CLI's 'file:list' command.

    Args:
        project_path (str): Local path to SuiteCloud project
    """
    if not shutil.which("suitecloud"):
        return "❌ Error: 'suitecloud' CLI is not found in your PATH. Please install or check your PATH configuration."

    original_dir, _ = get_project_dirs()
    # abs_project_path = r"C:\Users\Administrator\Downloads\prod_dep\pythonn_backend\TestSDFProject"
    abs_project_path = os.path.join(original_dir, project_path)
    if not os.path.exists(abs_project_path):
        return f"❌ Project path does not exist: {abs_project_path}"

    print(f"📂 Changing directory to: {abs_project_path}")
    os.chdir(abs_project_path)

    command = ["suitecloud", "file:list", "--folder", "/SuiteScripts"]

    print(f"🚀 Running command: {' '.join(command)}")

    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        return f"✅ Retrieved SuiteScript metadata successfully.\n📨 {result.stdout}\n📨 Acknowledgement: SuiteScript metadata extraction completed."
    except subprocess.CalledProcessError as e:
        print("❌ Error retrieving SuiteScript metadata:")
        print("STDERR:", e.stderr)
        print("STDOUT:", e.stdout)
        return f"❌ Metadata retrieval failed: {e.stderr or e.stdout or 'Unknown error'}"

def handle_netsuite_data_request(user_input):
    """
    Handles requests to either download a SuiteScript file or extract metadata,
    based on user input keywords.
    """
    user_input_lower = user_input.lower()
    if "download" in user_input_lower:
        # Example: "Download restlet_basic.js"
        file_name = "restlet_basic.js"  # Default or parse from input
        return download_suitescript_file(file_name, project_path="TestSDFProject")
    elif "metadata" in user_input_lower or "list scripts" in user_input_lower:
        return extract_custom_suitescript_metadata(project_path="TestSDFProject")
    else:
        return "❌ I couldn't determine what SuiteScript action you need. Please specify if you want to download a file or list SuiteScript metadata."


import os
import re

def save_generated_files(ai_response, user_input):
    """
    Detects all JS and XML code blocks separately and saves them.
    XML filenames are automatically set to the <customscript scriptid="..."> if found.
    """
    def create_project(project_name):
        os.makedirs(project_name, exist_ok=True)

    # Extract project name
    project_match = re.search(r'sdf project (\w+)', user_input, re.IGNORECASE)
    project_name = project_match.group(1) if project_match else "TestSDFProject"
    create_project(project_name)

    total_saved = 0

    # --- JS code blocks ---
    js_pattern = re.compile(r"(`(?P<filename>[\w\-/\\]+\.js)`)?\s*```(javascript|js)\s*\n(?P<code>.*?)```",
                            re.DOTALL | re.IGNORECASE)

    for match in js_pattern.finditer(ai_response):
        filename = match.group("filename")
        if not filename:
            filename = f"GeneratedScript_{total_saved+1}.js"
        filename = filename.replace("\\", "/").strip()
        code = match.group("code").strip()

        base_dir = os.path.join(project_name, "src/FileCabinet/SuiteScripts")
        filepath = os.path.join(base_dir, filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(code)
        total_saved += 1

    # --- XML code blocks ---
    xml_pattern = re.compile(r"(`(?P<filename>[\w\-/\\]+\.xml)`)?\s*```xml\s*\n(?P<code>.*?)```",
                             re.DOTALL | re.IGNORECASE)

    for match in xml_pattern.finditer(ai_response):
        code = match.group("code").strip()

        # Try to find <customscript scriptid="...">
        scriptid_match = re.search(r'<customscript[^>]*scriptid="([^"]+)"', code, re.IGNORECASE)
        if scriptid_match:
            filename = f"{scriptid_match.group(1)}.xml"
        elif match.group("filename"):
            filename = match.group("filename").replace("\\", "/").strip()
        else:
            filename = f"GeneratedObject_{total_saved+1}.xml"

        base_dir = os.path.join(project_name, "src/Objects")
        filepath = os.path.join(base_dir, filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(code)
        total_saved += 1

    if total_saved == 0:
        return "❌ No valid js/xml code blocks found."
    else:
        return f"✅ Saved {total_saved} file(s) to project '{project_name}'."

