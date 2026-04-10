#!/bin/bash

# SmartFolio Documentation PDF Converter
# This script combines all documentation and converts to PDF
#
# Prerequisites:
#   - pandoc: brew install pandoc
#   - wkhtmltopdf: brew install wkhtmltopdf
#   OR
#   - Use online converter like markdown-to-pdf.com

echo "SmartFolio Documentation PDF Generator"
echo "======================================="

# Check for pandoc
if command -v pandoc &> /dev/null; then
    echo "Using pandoc for conversion..."

    # Combine all markdown files
    cat TECHNICAL_DOCUMENTATION.md > FULL_DOCUMENTATION.md
    echo -e "\n\n---\n\n" >> FULL_DOCUMENTATION.md
    cat TECHNICAL_DOCUMENTATION_PART2.md >> FULL_DOCUMENTATION.md

    # Convert to PDF with styling
    pandoc FULL_DOCUMENTATION.md \
        -o SmartFolio_Technical_Documentation.pdf \
        --pdf-engine=wkhtmltopdf \
        --toc \
        --toc-depth=3 \
        -V geometry:margin=1in \
        -V fontsize=11pt \
        -V documentclass=report \
        --highlight-style=tango \
        --metadata title="SmartFolio Technical Documentation" \
        --metadata author="SmartFolio Engineering Team" \
        --metadata date="April 2026"

    echo "PDF generated: SmartFolio_Technical_Documentation.pdf"

elif command -v grip &> /dev/null; then
    echo "Using grip for HTML preview..."
    grip FULL_DOCUMENTATION.md --export SmartFolio_Documentation.html
    echo "HTML generated: SmartFolio_Documentation.html"
    echo "Open in browser and print to PDF"

else
    echo "No converter found. Install pandoc:"
    echo "  brew install pandoc wkhtmltopdf"
    echo ""
    echo "Or use online converters:"
    echo "  - https://www.markdowntopdf.com/"
    echo "  - https://md2pdf.netlify.app/"
    echo "  - VS Code extension: Markdown PDF"
fi

echo ""
echo "Documentation files:"
ls -la *.md 2>/dev/null
