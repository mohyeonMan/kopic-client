# game-chat feature

## Ownership

- chat list presentation
- guess input form state
- guess submit command boundary
- chat scroll UI behavior

## Uses

- `entities/game`
- `features/game-session` command boundary

## Must Not Own

- participant score calculation
- board overlay state
- raw server chat payload decoding

## Migration Position

Migrated after `game-session` command and inbound message boundaries were introduced.
