#!/usr/bin/env python3
"""
Comprehensive Code Formatting Script
Format all Python, JavaScript, CSS, HTML, and JSON files in the project
"""

import subprocess
import sys


def run_command(command, description, check_success=True):
    """Run a command and report results"""
    print(f"\n🔧 {description}...")
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True
        )
        if result.returncode == 0:
            print(f"✅ {description} completed successfully")
            if result.stdout.strip():
                # Only show first few lines of output to avoid spam
                output_lines = result.stdout.strip().split("\n")
                for line in output_lines[:5]:
                    print(f"   {line}")
                if len(output_lines) > 5:
                    print(f"   ... and {len(output_lines) - 5} more files")
        else:
            if check_success:
                print(f"❌ {description} failed:")
                print(result.stderr)
                return False
            else:
                print(f"⚠️ {description} completed with warnings:")
                print(result.stderr)
    except Exception as e:
        print(f"❌ Error running {description}: {e}")
        return False
    return True


def check_tool_available(command, tool_name):
    """Check if a tool is available"""
    try:
        result = subprocess.run(
            f"{command} --version", shell=True, capture_output=True
        )
        return result.returncode == 0
    except Exception:
        print(f"⚠️ {tool_name} not available")
        return False


def main():
    """Main formatting function"""
    print("🎨 Starting comprehensive code formatting for Spotify project...")
    print("This will format Python, JavaScript, CSS, HTML, and JSON files")
    print("Note: Run this script from the project root directory")

    # Get Python executable path
    python_exe = sys.executable

    # Check if npm tools are available
    npm_available = check_tool_available("npm", "npm")

    success = True

    # Python formatting commands
    backend_path = "src/backend/"
    python_commands = [
        (
            f'"{python_exe}" -m isort {backend_path} --profile black '
            "--line-length 79",
            "Organizing Python imports with isort",
        ),
        (
            f'"{python_exe}" -m black {backend_path} --line-length 79',
            "Formatting Python code with Black",
        ),
        (
            f'"{python_exe}" -m flake8 {backend_path} --max-line-length=79 '
            "--extend-ignore=E203,W503",
            "Checking Python code quality with Flake8",
            False,  # Don't fail on warnings
        ),
    ]

    # Web formatting commands (if npm is available)
    web_commands = []
    if npm_available:
        web_commands = [
            ("npm run format", "Formatting web files with Prettier"),
            ("npm run lint:js", "Checking JavaScript with ESLint", False),
            ("npm run lint:css", "Checking CSS with Stylelint", False),
        ]

    # Run Python formatting
    print("\n📐 Python Formatting:")
    for command_info in python_commands:
        check_success = len(command_info) < 4 or command_info[3]
        command, description = command_info[0], command_info[1]
        if not run_command(command, description, check_success):
            if check_success:
                success = False

    # Run web formatting
    if web_commands:
        print("\n🌐 Web Files Formatting:")
        for command_info in web_commands:
            check_success = len(command_info) < 4 or command_info[3]
            command, description = command_info[0], command_info[1]
            if not run_command(command, description, check_success):
                if check_success:
                    success = False
    else:
        print(
            "\n⚠️ Web formatting tools not available. "
            "Install with: npm install"
        )

    # Summary
    if success:
        print("\n🎉 All formatting completed successfully!")
        print("Your code is now compliant with:")
        print("  ✅ Python: Black, Flake8, and PEP8 standards")
        if npm_available:
            print("  ✅ JavaScript: Prettier and ESLint standards")
            print("  ✅ CSS: Prettier and Stylelint standards")
            print("  ✅ HTML: Prettier standards")
            print("  ✅ JSON: Prettier standards")
    else:
        print(
            "\n⚠️ Some formatting steps failed. Please check the "
            "output above."
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
