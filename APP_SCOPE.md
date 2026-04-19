# App Scope: The Archivist

"The Archivist" is a personal reading sanctuary designed to transform reading from a passive activity into a structured journey of wisdom collection. It is a full-stack web application that balances quantitative tracking (pages read) with qualitative synthesis (reflections).

## Core Philosophy
The app treats books as "volumes" in a "sacred archive." It moves away from the "gamified" feel of modern trackers towards a serene, focus-oriented environment.

## Target Features
1.  **Multi-Mode Tracking:** Support for both Physical books and Digital manuscripts (PDFs).
2.  **Integrated Reading:** A built-in PDF reader that synchronizes progress automatically as you read.
3.  **Active Synthesis:** A reflection system that prompts users for "Learning," "Application," and "Disagreement" rather than just a simple star rating.
4.  **Library Management:** Categorization of books into "Now Reading," "Up Next," and "Completed."
5.  **Quantitative Analytics:** Daily progress tracking with visual progress bars and reading history timelines.
6.  **Responsive Design:** A mobile-friendly interface with a dedicated sidebar and navigation dock.

## Technical Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS (v4), Framer Motion.
- **Backend:** Node.js, Express, Better-SQLite3.
- **Storage:** Local filesystem for PDF and Cover image uploads.
- **PDF Engine:** PDF.js (Mozilla).
