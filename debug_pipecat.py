import sys
import os

print(f"Python executable: {sys.executable}")
print(f"Python version: {sys.version}")

try:
    import pipecat
    print(f"Pipecat location: {os.path.dirname(pipecat.__file__)}")
    
    # List contents of pipecat directory
    pipecat_dir = os.path.dirname(pipecat.__file__)
    print(f"Contents of {pipecat_dir}:")
    for root, dirs, files in os.walk(pipecat_dir):
        level = root.replace(pipecat_dir, '').count(os.sep)
        indent = ' ' * 4 * (level)
        print(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            print(f"{subindent}{f}")

except ImportError as e:
    print(f"Failed to import pipecat: {e}")

try:
    import pipecat.transports
    print("Successfully imported pipecat.transports")
except ImportError as e:
    print(f"Failed to import pipecat.transports: {e}")
