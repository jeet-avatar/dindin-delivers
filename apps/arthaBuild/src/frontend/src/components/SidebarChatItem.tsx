import { useState } from "react";
import { MoreVertical } from "lucide-react"; // for ⋮ menu

function SidebarChatItem({ chat, onRename, onDelete, onSelect }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSave = () => {
    if (title.trim()) {
      onRename(chat.id, title.trim());
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between px-2 py-1 hover:bg-slate-700 rounded relative">
      {editing ? (
        <input
          className="bg-slate-800 text-white text-sm rounded px-2 py-1 flex-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          autoFocus
        />
      ) : (
        <button
          className="text-left flex-1 truncate"
          onClick={() => onSelect(chat.id)}
        >
          {chat.title}
        </button>
      )}

      {/* ⋮ Menu trigger */}
      <button
        onClick={() => setMenuOpen((prev) => !prev)}
        className="ml-2 text-slate-400 hover:text-white"
      >
        <MoreVertical size={16} />
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <ul className="absolute right-0 top-7 bg-slate-800 shadow-lg rounded w-32 z-20 text-sm">
          <li
            className="px-3 py-2 hover:bg-slate-700 cursor-pointer"
            onClick={() => {
              setEditing(true);
              setMenuOpen(false);
            }}
          >
            Rename
          </li>
          <li
            className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-red-400"
            onClick={() => onDelete(chat.id)}
          >
            Delete
          </li>
        </ul>
      )}
    </div>
  );
}

export default SidebarChatItem;