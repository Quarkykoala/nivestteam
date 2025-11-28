# Netlify Python runtime notes

- Netlify's Focal build image documents Python as selectable via `PYTHON_VERSION`, `runtime.txt`, or a `Pipfile`, with Python 3.8 as the default (`"* Python - \`PYTHON_VERSION\`, \`runtime.txt\`, \`Pipfile\"` and `"* 3.8 (default)"`). This indicates Netlify will install the requested runtime if it is available to `python-build` (pyenv).【https://raw.githubusercontent.com/netlify/build-image/focal/included_software.md】
- The pyenv `python-build` plugin publishes a definition file for Python 3.12.4, which Netlify uses when a build requests `python-3.12.4` in `runtime.txt`.【https://raw.githubusercontent.com/pyenv/pyenv/master/plugins/python-build/share/python-build/3.12.4】
- Because a 3.12.4 definition exists, the risk of a Netlify build failing is low and mainly limited to transient download issues or future changes in the build image. Staying on the 3.12.x line avoids the "definition not found" failure that happened with 3.13.12.
