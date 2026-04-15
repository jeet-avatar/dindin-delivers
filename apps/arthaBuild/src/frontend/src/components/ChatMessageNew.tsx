import React from "react";
import { Bot, User, Loader2 } from "lucide-react";
import { Message } from "../types/message";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { format } from "sql-formatter";

function parseStructured(text: string) {
  const qIdx = text.indexOf("Question:");
  const aIdx = text.indexOf("Answer:");
  if (qIdx === -1 || aIdx === -1) return null;
  const question = text.substring(qIdx + 9, aIdx).trim();
  const answer = text.substring(aIdx + 7).trim();
  return { question, answer };
}

interface ChatMessageProps {
  m: Message;
  onRemoveLoader?: () => void;
}

export default function ChatMessage({ m, onRemoveLoader }: ChatMessageProps) {
  // if (m.role === "thinking") {
  //   return (
  //     <div className="flex justify-start items-center gap-3 my-4 text-slate-400">
  //       <Loader2 className="w-4 h-4 animate-spin" />
  //       <span>Thinking...</span>
  //     </div>
  //   );
  // }

  function renderContent(text: string) {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const [fullMatch, lang, code] = match;
      const before = text.slice(lastIndex, match.index);
      if (before.trim()) {
        parts.push(
          <p key={lastIndex} className="mb-2">
            {before}
          </p>
        );
      }

      console.log("type", typeof code);
      console.log("code", code);

      let messageText = "";
      if (code.includes("ORDER BY")) {
        messageText = format(code.trim(), { language: "mysql" });
        parts.push(
          <SyntaxHighlighter
            key={match.index}
            language={lang || "text"}
            style={oneDark}
            wrapLongLines
            customStyle={{ borderRadius: "0.5rem", fontSize: "0.85rem" }}
          >
            {messageText}
          </SyntaxHighlighter>
        );
      } else if (code.includes("[")) {
        // messageText= code;
        // Array.isArray(code)
        // console.log('inside array format');

        let parsedCode = JSON.parse(code);
        // console.log('parsed',parsedCode);

        const columns = Object.keys(parsedCode[0]);
        parts.push(
          <div
            style={{
              height: "200px",
              overflow: "scroll",
            }}
          >
            <table
              border={1}
              cellPadding="5"
              cellSpacing="0"
              style={{ maxHeight: 200, overflowY: "scroll" }}
            >
              <thead>
                <tr>
                  {/* Render table headers dynamically from columns */}
                  {columns.map((col, index) => (
                    <th key={index}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedCode.map((item, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map((col, colIndex) => (
                      <td key={colIndex}>{item[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

        // Call removeLoader after table is rendered
        if (onRemoveLoader) {
          onRemoveLoader();
        }
      } else {
        messageText = code;
        parts.push(messageText);
      }

      lastIndex = match.index + fullMatch.length;
    }

    const after = text.slice(lastIndex);
    if (after.trim()) {
      parts.push(
        <p key={lastIndex} className="mb-2">
          {after}
        </p>
      );
    }

    return parts;
  }

  // Call removeLoader after content is rendered
  React.useEffect(() => {
    if (onRemoveLoader) {
      onRemoveLoader();
    }
  }, [m.content, onRemoveLoader]);

  const isUser = m.role === "user";
  const structured = parseStructured(m.content);

  return (
    <div
      className={`flex items-start gap-3 my-4 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="p-2 bg-indigo-600 rounded-full self-start">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={`max-w-2xl px-4 py-3 rounded-2xl whitespace-pre-wrap ${
          isUser
            ? "bg-indigo-600 text-white ml-auto"
            : "bg-slate-800 text-gray-100"
        }`}
      >
        {structured ? (
          <div className="space-y-2">
            {/* <div className="font-semibold text-lg">❓ {structured.question}</div> */}
            {renderContent(structured.answer)}
            {/* {!isUser && (
              <p className="text-sm text-slate-400 mt-3">
                Do you want me to execute this?
              </p>
            )} */}
          </div>
        ) : (
          renderContent(m.content)
        )}
      </div>

      {isUser && (
        <div className="p-2 bg-slate-600 rounded-full self-start">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}
