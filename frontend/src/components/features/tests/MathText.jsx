import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Helper function to render text with math formulas and simple HTML superscripts
export default function MathText({ text }) {
    if (!text) return null;

    let key = 0;

    // Render a plain string `str` with math parsing ($ and $$), returning an array of nodes
    const renderMathParts = (str) => {
        const nodes = [];
        let remaining = str;

        while (remaining.length > 0) {
            const blockStart = remaining.indexOf('$$');
            if (blockStart !== -1) {
                if (blockStart > 0) {
                    nodes.push(<span key={key++}>{remaining.substring(0, blockStart)}</span>);
                }
                const blockEnd = remaining.indexOf('$$', blockStart + 2);
                if (blockEnd !== -1) {
                    const formula = remaining.substring(blockStart + 2, blockEnd);
                    nodes.push(<BlockMath key={key++} math={formula} />);
                    remaining = remaining.substring(blockEnd + 2);
                } else {
                    nodes.push(<span key={key++}>{remaining}</span>);
                    break;
                }
            } else {
                const inlineStart = remaining.indexOf('$');
                if (inlineStart !== -1) {
                    if (inlineStart > 0) {
                        nodes.push(<span key={key++}>{remaining.substring(0, inlineStart)}</span>);
                    }
                    const inlineEnd = remaining.indexOf('$', inlineStart + 1);
                    if (inlineEnd !== -1) {
                        const formula = remaining.substring(inlineStart + 1, inlineEnd);
                        nodes.push(<InlineMath key={key++} math={formula} />);
                        remaining = remaining.substring(inlineEnd + 1);
                    } else {
                        nodes.push(<span key={key++}>{remaining}</span>);
                        break;
                    }
                } else {
                    nodes.push(<span key={key++}>{remaining}</span>);
                    break;
                }
            }
        }

        return nodes;
    };

    // Now split the original text by <sup>...</sup> tags and render each segment.
    const parts = [];
    const supRegex = /<sup>([\s\S]*?)<\/sup>/i;
    let remaining = text;

    while (remaining.length > 0) {
        const match = remaining.match(supRegex);
        if (match) {
            const idx = match.index;
            if (idx > 0) {
                const before = remaining.substring(0, idx);
                parts.push(...renderMathParts(before));
            }
            // match[1] contains the superscript content
            parts.push(<sup key={key++}>{match[1]}</sup>);
            remaining = remaining.substring(idx + match[0].length);
        } else {
            parts.push(...renderMathParts(remaining));
            break;
        }
    }

    return <>{parts}</>;
}
