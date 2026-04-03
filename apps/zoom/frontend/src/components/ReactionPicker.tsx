const REACTIONS = ['👍', '👏', '❤️', '😂', '😮', '🎉', '🙌', '🔥'];

interface ReactionPickerProps {
  onPick: (emoji: string) => void;
  onClose: () => void;
}

export function ReactionPicker({ onPick, onClose }: ReactionPickerProps) {
  return (
    <div className="reaction-picker" onMouseLeave={onClose}>
      {REACTIONS.map(emoji => (
        <button
          key={emoji}
          className="reaction-pick-btn"
          onClick={() => { onPick(emoji); onClose(); }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
