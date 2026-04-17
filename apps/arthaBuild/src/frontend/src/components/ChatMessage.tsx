import React from "react";
import { Bot, User, Loader2 , Fullscreen, Download } from "lucide-react";
import { Message } from "../types/message";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { format } from 'sql-formatter';
import toggleFullscreen from "toggle-fullscreen";
import * as FileSaver from "file-saver";
import * as XLSX from "xlsx";
import moment from 'moment';


const fileType =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
const fileExtension = ".xlsx";

function parseStructured(text: string) {
  const qIdx = text.indexOf("Question:");
  const aIdx = text.indexOf("Answer:");
  if (qIdx === -1 || aIdx === -1) return null;
  const question = text.substring(qIdx + 9, aIdx).trim();
  const answer = text.substring(aIdx + 7).trim();
  return { question, answer };
}



export default function ChatMessage({ m }: { m: Message } , removeLoading: any) {
  
  // if (m.role === "thinking") {
  //   return (
  //     <div className="flex justify-start items-center gap-3 my-4 text-slate-400">
  //       <Loader2 className="w-4 h-4 animate-spin" />
  //       <span>Thinking...</span>
  //     </div>
  //   );
  // }

  const exportData = (parsedCode: any[], columns: string[]) => {
    // Convert parsedCode + columns into array of objects
      const arr = parsedCode.map((row) => {
        let obj: any = {};
        columns.forEach((col) => {
          obj[col] = row[col]; // pick value directly by key
        });
        return obj;
      });
      console.log('arr',arr)
      let fileName='Data-'+moment().format('DD-MM-YYYY-HH-mm-ss');
      const ws = XLSX.utils.json_to_sheet(arr);
      const wb = { Sheets: { data: ws }, SheetNames: ["data"] };
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const data = new Blob([excelBuffer], { type: fileType });
      FileSaver.saveAs(data, fileName + fileExtension);
      // ("Participant data exported successfully.");
  }
  const showFullscreen=()=>{
    var elem = document.getElementById('table-data');
    toggleFullscreen(elem);
  }

  const downloadSuiteScript = () => {
    const match = m.content.match(/```(?:javascript|js)\n([\s\S]*?)```/);
    if (!match) {
      alert("No JavaScript code block found in this message.");
      return;
    }
    const code = match[1];
    const blob = new Blob([code], { type: "text/javascript" });
    FileSaver.saveAs(blob, `suitescript-${Date.now()}.js`);
  };

function isSQLQuery(str) {
  if (!str || typeof str !== "string") return false;

  // Common SQL keywords at the beginning of queries
  const sqlPatterns = /^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|WITH)\s+/i;

  return sqlPatterns.test(str.trim());
}

  function renderContent(text: string) {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const [fullMatch, lang, code] = match;
    const before = text.slice(lastIndex, match.index);
    if (before.trim()) {
      parts.push(<p key={lastIndex} className="mb-2">{before}</p>);
    }

    let messageText= '';
    // code.includes('ORDER BY')
    if(isSQLQuery(code)){
      messageText= format(code.trim(), { language: 'mysql' });
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
    }else if (code.trim().startsWith('[') && (() => { try { JSON.parse(code); return true; } catch { return false; } })()) {
      let parsedCode=JSON.parse(code);
      let list=[]
      let index=0
      for(let item of parsedCode){
        if(index<10){
          list.push(item)
        }
      }
      
      const columns = Object.keys(parsedCode[0]);
      parts.push( 
        <div
        id="table-data"
        style={{position:'relative'}}
        >
          <div
          style={{
            display: 'flex',
            justifyContent:'flex-end'
          }}
          >
            <button onClick={()=>exportData(parsedCode,columns)}><Download /></button> &nbsp;&nbsp;
            <button onClick={()=>showFullscreen()}><Fullscreen  /></button>
          </div>
        <div
        style={{
          height: '200px',
          overflow: 'auto',
          overflowX: 'auto',
        }}
        >
          
          <br/><br/>
           <table border={1} cellPadding="5" cellSpacing="0" 
            className="chat-export-table"
           style={{overflowY:'scroll'}}>
            <thead>
              <tr>
                {/* Render table headers dynamically from columns */}
                {columns.map((col, index) => (
                  <th key={index} style={{textTransform:'capitalize'}}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((item, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((col, colIndex) => (
                    <td key={colIndex}>{item[col]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      );

      // removeLoading();
    }else {
      messageText= code;
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
    }
    
    lastIndex = match.index + fullMatch.length;
  }

  const after = text.slice(lastIndex);
  if (after.trim()) {
    parts.push(<p key={lastIndex} className="mb-2">{after}</p>);
  }

  return parts;
}

  const isUser = m.role === "user";
  const structured = parseStructured(m.content);

  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="p-2 bg-indigo-600 rounded-full self-start">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={`max-w-2xl px-4 py-3 rounded-2xl whitespace-pre-wrap ${
          isUser ? "bg-indigo-600 text-white ml-auto" : "bg-slate-800 text-gray-100"
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

      {!isUser && m.intent === "generate_suitescript" && (
        <button
          onClick={downloadSuiteScript}
          className="flex items-center gap-1 mt-2 px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg self-start"
          title="Download SuiteScript file"
        >
          <Download className="w-3 h-3" />
          Download .js
        </button>
      )}

      {isUser && (
        <div className="p-2 bg-slate-600 rounded-full self-start">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}