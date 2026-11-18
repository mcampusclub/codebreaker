# Codebreaker — Microsoft Campus Club

A standalone, static daily numeric Mastermind game, ready for Vercel.

## Run locally

Open `index.html` in a browser, or serve this folder with any static web server.

## Deploy to Vercel

1. Push the contents of this folder to a GitHub repository.
2. Import the repository into Vercel.
3. Choose **Other** as the framework preset.
4. Leave Build Command and Install Command empty.
5. Set Output Directory to `.` (or leave the default for a static project).
6. Deploy.

## Daily challenge rules

- Challenge boundary: 12:00 PM Asia/Kolkata (IST).
- Before noon, the previous challenge remains active; at/after noon, the current date's challenge is active.
- A deterministic daily seed selects a code length from 4 through 10 and a sequence of unique digits from 0–9.
- The same date and game version produce the same challenge for every player.
- Attempts allowed: N + 4.
- The code may begin with zero. Repeated digits are not allowed in guesses.
- Progress is saved in the player's browser localStorage for that challenge date. It is not synced between devices.

## Important limitation

This is a client-side daily game. The seed and answer are generated in browser JavaScript, so this is suitable for a casual club challenge, not a cheat-resistant competition. A backend would be needed for server-verified scores and shared leaderboards.
