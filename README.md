# Trojan Debate Society Pairings System

A web application for automatically generating debate chamber assignments, managing position rotations, and tracking debater histories for parliamentary debate tournaments.

## Features

### Core Functionality

- **Automatic Chamber Creation**: Generates balanced debate chambers based on experience levels
- **Position Rotation Tracking**: Ensures fair rotation through all debate positions (OG, OO, CG, CO)
- **Partner Management**: Automatically pairs debaters with their designated partners
- **Judge Assignment**: Assigns available judges to chambers
- **Spectator Handling**: Identifies and manages spectators and their partners

### Advanced Features

- **Half-Round Support**: Create opening-only or closing-only debate rounds
- **Mixed Experience Chambers**: Smart mixing when insufficient teams at single experience level
- **Drag-and-Drop Position Swapping**: Manually adjust team positions in chambers
- **Custom Room Naming**: Set custom room numbers/names for each chamber
- **Position History Tracking**: Automatically tracks which positions each debater has done
- **Multiple Import Options**: CSV file upload, Google Sheets integration, or direct paste

### Export Options

- **CSV Export**: Download complete pairing assignments
- **Print/PDF Export**: Clean, compact display view for printing or PDF conversion
- **History Export**: Download complete position history for all debaters

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Clone this repository:

```bash
git clone https://github.com/yourusername/debate-pairings.git
cd debate-pairings
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

4. Open your browser to `http://localhost:3000`

## Usage

### CSV Format

Your CSV file must include these columns:

- **Name**: Debater's full name (required)
- **Partner (leave blank if none)**: Partner's name (optional)
- **Experience Level**: One of: `Returning Members`, `Competitive Team Fall '25`, or `General Members` (required)
- **Preference**: `Opening Half`, `Closing Half`, or leave blank (optional)
- **Half Round?**: `Opening Half`, `Closing Half`, or leave blank (optional)
- **Role**: `Debate`/`Debating`, `Judge`/`Judging`, or `Spectate`/`Spectating` (optional, defaults to Debate)

### Example CSV

```csv
Name,Partner (leave blank if none),Experience Level,Preference,Half Round?,Role
Alice Johnson,Bob Smith,Returning Members,Opening Half,,Debate
Bob Smith,Alice Johnson,Returning Members,Opening Half,,Debate
Charlie Davis,Dana Lee,General Members,,,Debate
Dana Lee,Charlie Davis,General Members,,,Debate
Judge Smith,,Returning Members,,,Judging
Spectator Joe,Spectator Jane,General Members,,,Spectating
Spectator Jane,Spectator Joe,General Members,,,Spectating
Half Round Team A,Half Round Team B,Returning Members,,Opening Half,Debate
Half Round Team B,Half Round Team A,Returning Members,,Opening Half,Debate
```

### Google Sheets Integration

1. In Google Sheets, go to **File → Share → Publish to web**
2. Select **CSV** format
3. Click **Publish**
4. Copy the generated URL
5. Paste into the "Google Sheets Published CSV URL" field in the app
6. Click "Load from Sheets"

### Generating Pairings

1. **Import Data**: Upload CSV, load from Google Sheets, or paste CSV data
2. **Review Participants**: Check that all participants loaded correctly
3. **Generate Pairings**: Click "Generate Pairings" button
4. **Review Chambers**: Check chamber assignments in the Chambers tab
5. **Make Adjustments**: Drag and drop teams to swap positions if needed
6. **Set Room Numbers**: Click on room names to edit (e.g., "Room 1" → "330")
7. **Export**: Use Display tab for printing or CSV export for records

### Position Rotation System

The system automatically tracks which positions each debater has done:

- First-time debaters get their preference (Opening/Closing Half) or default to OG
- System rotates through all 4 positions before repeating
- Half-round participants only rotate through opening (OG/OO) or closing (CG/CO) positions
- History persists across sessions using browser localStorage

### Round Types

- **Full Round**: 4 teams debate all positions (OG, OO, CG, CO)
- **Opening Half Only**: 2 teams debate opening positions (OG, OO)
- **Closing Half Only**: 2 teams debate closing positions (CG, CO)

Teams requesting half-rounds are paired with other half-round teams when possible.

## Features in Detail

### Smart Chamber Creation

- Groups teams by experience level first
- Creates 4-team chambers when possible
- Creates mixed-experience chambers from remaining teams
- Automatically creates half-round chambers for 2 remaining teams
- Moves odd teams to spectators

### Spectator Logic

- Explicit spectators (marked as "Spectating" role)
- Partners of spectators automatically become spectators
- Iterative checking ensures both partners are always spectators

### Judge Assignment

- Only "Returning Members" with "Judging" role can judge
- Judges assigned sequentially to chambers
- Warns if insufficient judges available

## Data Persistence

Position history is automatically saved to browser localStorage and persists across sessions. To clear history:

1. Go to History tab
2. Click "Clear History"
3. Confirm the action

## Browser Compatibility

Works best in modern browsers:

- Chrome/Edge (recommended)
- Firefox
- Safari

## Technologies Used

- **React**: UI framework
- **Tailwind CSS**: Styling
- **Lucide React**: Icons
- **Browser localStorage**: Data persistence

## Support

For issues or questions, please open an issue on GitHub.

## License

MIT License - feel free to use and modify for your debate society!

## Credits

Created for the Trojan Debate Society at the University of Southern California.
