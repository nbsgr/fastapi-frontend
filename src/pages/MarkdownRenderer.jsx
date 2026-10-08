import React, { useState, useMemo, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js/lib/core";
import "highlight.js/styles/github-dark.css";
import "./MarkdownRenderer.css";

// --- Language Registration ---
import javascript from "highlight.js/lib/languages/javascript";
import java from "highlight.js/lib/languages/java";
import python from "highlight.js/lib/languages/python";
import cpp from "highlight.js/lib/languages/cpp";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import sql from "highlight.js/lib/languages/sql";
import plaintext from "highlight.js/lib/languages/plaintext";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("java", java);
hljs.registerLanguage("python", python);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("plaintext", plaintext);

function Paragraph(props) {
  return <div className="cgpt-paragraph">{props.children}</div>;
}

function UnorderedList(props) {
  return <ul className="cgpt-list">{props.children}</ul>;
}

function OrderedList(props) {
  return <ol className="cgpt-list">{props.children}</ol>;
}

function CodeBlock(props) {
  const code = props.code;
  const language = props.language;
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(function () {
    try {
      const lang = hljs.getLanguage(language) ? language : "plaintext";
      return hljs.highlight(code, { language: lang }).value;
    } catch (e) {
      console.warn("[DEBUG] Highlighting failed for:", language, e);
      return code;
    }
  }, [code, language]);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(function () {
      setCopied(false);
    }, 1500);
  }

  return (
    <div className="cgpt-code-wrapper">
      <div className="cgpt-code-header">
        <span className="cgpt-code-lang">{language}</span>
        <button className="cgpt-code-copy" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="cgpt-code-block">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

const MemoizedCodeBlock = memo(CodeBlock);

function CodeComponent(props) {
  const inline = props.inline;
  const className = props.className;
  const children = props.children;

  const codeString = String(children).replace(/\n$/, "");
  const match = /language-([\w-]+)/.exec(className || "");
  const detectedLang = match ? match[1] : "plaintext";

  if (inline) {
    return <code className="cgpt-inline-code">{children}</code>;
  }

  return <MemoizedCodeBlock code={codeString} language={detectedLang} />;
}

function MarkdownRenderer(props) {
  const content = props.content;
  const safeContent = useMemo(function () {
    return typeof content === "string" ? content : String(content || "");
  }, [content]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: Paragraph,
        code: CodeComponent,
        ul: UnorderedList,
        ol: OrderedList
      }}
    >
      {safeContent}
    </ReactMarkdown>
  );
}

export default memo(MarkdownRenderer);