import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Helper function to render text with math formulas
export default function MathText({ text }) {
    if (!text) return null;

    // Split text by $$ (block math) and $ (inline math)
    const parts = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        // Check for block math $$...$$
        const blockStart = remaining.indexOf('$$');
        if (blockStart !== -1) {
            // Add text before $$
            if (blockStart > 0) {
                parts.push(<span key={key++}>{remaining.substring(0, blockStart)}</span>);
            }
            // Find closing $$
            const blockEnd = remaining.indexOf('$$', blockStart + 2);
            if (blockEnd !== -1) {
                const formula = remaining.substring(blockStart + 2, blockEnd);
                parts.push(<BlockMath key={key++} math={formula} />);
                remaining = remaining.substring(blockEnd + 2);
            } else {
                // No closing $$, treat as regular text
                parts.push(<span key={key++}>{remaining}</span>);
                break;
            }
        } else {
            // No more block math, check for inline math $...$
            const inlineStart = remaining.indexOf('$');
            if (inlineStart !== -1) {
                // Add text before $
                if (inlineStart > 0) {
                    parts.push(<span key={key++}>{remaining.substring(0, inlineStart)}</span>);
                }
                // Find closing $
                const inlineEnd = remaining.indexOf('$', inlineStart + 1);
                if (inlineEnd !== -1) {
                    const formula = remaining.substring(inlineStart + 1, inlineEnd);
                    parts.push(<InlineMath key={key++} math={formula} />);
                    remaining = remaining.substring(inlineEnd + 1);
                } else {
                    // No closing $, treat as regular text
                    parts.push(<span key={key++}>{remaining}</span>);
                    break;
                }
            } else {
                // No more math, add remaining text
                parts.push(<span key={key++}>{remaining}</span>);
                break;
            }
        }
    }

    return <>{parts}</>;
}
