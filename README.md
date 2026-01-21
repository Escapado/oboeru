# Oboeru

A spaced repetition flashcard plugin for Obsidian using the FSRS (Free Spaced Repetition Scheduler) algorithm.

## Features

- 🧠 **FSRS-6 Algorithm** - Modern, research-backed spaced repetition
- 📝 **Two Card Formats** - Simple inline or multi-line cards
- 📊 **Smart Scheduling** - Optimized review intervals based on your performance
- 🎯 **Improved Cram Mode** - Focused practice with Again/Good buttons and automatic retry system
- 🔀 **Randomized Order** - Cards are shuffled for better learning
- 👁️ **Clean Editor** - Metadata is hidden by default with a compact indicator
- ⚙️ **Customizable** - Adjust retention rate, intervals, and daily limits
- 📱 **Mobile Friendly** - Works on all Obsidian platforms

## Quick Start

### 1. Create Flashcards

Tag any note with `#flashcards` to turn it into a deck. Then add cards using one of these formats:

**Single-line format:**
```
What is the capital of France?::Paris
```

**Multi-line format:**
```
What is the capital of France?
?
Paris is the capital and largest city of France.
+++
```

### 2. Review Your Cards

1. Click the Oboeru icon in the ribbon (or use the command palette)
2. Select a deck
3. Click "Review" to start your spaced repetition session
4. Rate each card: Again, Hard, Good, or Easy

The plugin automatically schedules cards based on your performance using the FSRS algorithm.

## Card Formats

### Single-Line Cards

Perfect for simple question-answer pairs:

```markdown
#flashcards

What is 2 + 2?::4
Who wrote "1984"?::George Orwell
Python uses what for comments?::# (hash symbol)
```

### Multi-Line Cards

Better for detailed answers:

```markdown
#flashcards

What is the SOLID principle?
?
SOLID is an acronym for five design principles:
- Single Responsibility
- Open/Closed
- Liskov Substitution
- Interface Segregation
- Dependency Inversion
+++

Explain photosynthesis
?
Photosynthesis is the process by which plants convert light energy into chemical energy.

Key components:
1. Chlorophyll captures light
2. Water is split into hydrogen and oxygen
3. CO2 is converted to glucose
+++
```

## Metadata

The plugin stores review data as HTML comments in your notes. By default, these are **hidden in the editor** and replaced with a compact indicator:

```markdown
What is the capital of France?::Paris
📊 SRS
```

Click the **📊 SRS** indicator to toggle visibility of the full metadata:

```markdown
What is the capital of France?::Paris
<!--OBOERU:{"v":1,"algo":"fsrs-6","reviewedAt":"2024-01-15T10:30:00Z","dueAt":"2024-01-20T10:30:00Z","s":5.2,"d":4.1,"rating":3,"reviews":5,"lapses":1}-->
```

The metadata includes:
- Review schedule (next due date)
- Stability and difficulty parameters
- Review history count
- Lapse count

You can disable metadata hiding in Settings → Oboeru → Editor if you prefer to always see the full metadata.

## Settings

Access settings via Settings → Oboeru:

### FSRS Algorithm
- **Request Retention** (0.7-0.97): Target recall probability. Higher = more reviews but better retention.
- **Maximum Interval**: Longest time between reviews (default: 100 years)
- **Daily New Card Limit**: Maximum new cards per deck per day

### Editor
- **Hide FSRS Metadata**: Show compact indicator instead of full metadata comment (enabled by default)

## Review vs Cram Mode

### Review Mode
- Uses FSRS scheduling
- Cards are shown based on due date (randomized)
- Your ratings affect future scheduling
- Limited to daily new card limit
- Four rating options: Again, Hard, Good, Easy
- Shows predicted intervals for each rating

### Cram Mode
- Shows all cards in the deck (randomized)
- Perfect for focused practice sessions
- Two simple options: **Again** or **Good**
- Cards marked "Again" are added to a retry pile
- After finishing all cards, retry pile is shuffled and shown again
- Continues in rounds until all cards are marked "Good"
- Ratings don't affect long-term scheduling (local state only)
- No daily limits
- Progress shows current round and remaining cards

## About FSRS

FSRS (Free Spaced Repetition Scheduler) is a modern alternative to traditional algorithms like SM-2. It uses machine learning to optimize review intervals based on actual human memory patterns.

Key advantages:
- More accurate predictions than SM-2
- Adapts to individual card difficulty
- Reduces unnecessary reviews
- Research-backed and actively maintained

Learn more: [FSRS Documentation](https://github.com/open-spaced-repetition/fsrs4anki)

## Tips & Best Practices

1. **Review Daily** - Consistency is key to effective spaced repetition
2. **Be Honest** - Rate cards based on how well you actually remembered
3. **Keep Cards Atomic** - One concept per card works best
4. **Use Tags** - Organize related decks with nested tags like `#flashcards/japanese`
5. **Start Small** - Begin with 10-20 cards per deck, add more as you get comfortable
6. **Use Cram Mode Wisely** - Perfect for exam prep or refreshing a deck before a test
7. **Mark Again Liberally** - In cram mode, don't hesitate to mark cards "Again" if unsure
8. **Metadata Indicators** - Click the 📊 SRS badge to show/hide metadata when needed

## Commands

- **Open flashcards** - Opens the Oboeru panel

## Support

If you encounter issues or have feature requests, please open an issue on GitHub.

## License

This plugin is released under the 0-BSD License.

## Credits

- FSRS algorithm by [Jarrett Ye](https://github.com/open-spaced-repetition/fsrs4anki)
- Built for [Obsidian](https://obsidian.md)