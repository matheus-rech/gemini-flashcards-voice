// This service simulates a client-side knowledge base.
// In a real-world, large-scale application, this would be a backend system
// with a vector database for efficient similarity searching (RAG).

const knowledgeBase = [
    `Confirmation Bias is the human tendency to search for, interpret, favor, and recall information in a way that confirms or supports one's prior beliefs or values. People display this bias when they gather or remember information selectively, or when they interpret it in a biased way. For example, a person who believes left-handed people are more creative may remember many instances of creative left-handed people but forget examples that do not support this belief. This bias affects individual and group decision-making and can lead to overconfidence and ignoring contrary evidence. It's a systematic error of inductive reasoning.`,

    `The Availability Heuristic is a mental shortcut that relies on immediate examples that come to a given person's mind when evaluating a specific topic, concept, method, or decision. The availability heuristic operates on the notion that if something can be recalled, it must be important, or at least more important than alternative solutions which are not as readily recalled. Consequently, people tend to heavily weigh their judgments toward more recent information, making new opinions biased toward that latest news. For example, after seeing several news reports about car thefts, you might make a judgment that vehicle theft is much more common than it really is in your area.`,

    `The Dunning-Kruger Effect is a cognitive bias in which people with low ability at a task overestimate their ability. It is related to the cognitive bias of illusory superiority and comes from the inability of people to recognize their lack of ability. Without the self-awareness of metacognition, people cannot objectively evaluate their own competence or incompetence. Conversely, highly competent individuals may underestimate their relative competence, erroneously assuming that tasks which are easy for them are also easy for others.`,

    `Survivorship Bias or survival bias is the logical error of concentrating on the people or things that "survived" some process and inadvertently overlooking those that did not because of their lack of visibility. This can lead to false conclusions in several different ways. The survivors may be actual people, as in a medical study, or could be companies or subjects that withstood some selection process. For example, during World War II, researchers were asked to determine where to add armor to bombers. They analyzed the returning planes and recommended adding armor to the areas that showed the most damage. However, statistician Abraham Wald noted that the researchers had only considered the planes that survived their missions; the planes that had been shot down were not present for the analysis. The holes in the returning planes, therefore, represented areas where a bomber could take damage and still return home safely. Wald proposed that the Navy reinforce areas where the returning planes were unscathed, since those were the areas that, if hit, would cause the plane to be lost.`,

    `Anchoring Bias is a cognitive bias where an individual depends too heavily on an initial piece of information offered (the "anchor") when making decisions. During decision making, anchoring occurs when individuals use an initial piece of information to make subsequent judgments. Once an anchor is set, other judgments are made by adjusting away from that anchor, and there is a bias toward interpreting other information around the anchor. For example, the initial price offered for a used car sets the standard for the rest of the negotiations, so that prices lower than the initial price seem more reasonable even if they are still higher than what the car is really worth.`
];

export const knowledgeBaseService = {
    /**
     * Finds the most relevant chunk of text from the knowledge base.
     * This is a simple keyword-based search simulation. A real RAG system
     * would use vector embeddings and similarity search.
     * @param query A string containing keywords from a user's weak card.
     * @returns The most relevant text chunk, or an empty string if none is found.
     */
    findRelevantChunk: (query: string): string => {
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        let bestChunk = '';
        let maxScore = 0;

        knowledgeBase.forEach(chunk => {
            const chunkLower = chunk.toLowerCase();
            let score = 0;
            queryWords.forEach(word => {
                if(chunkLower.includes(word)) {
                    score++;
                }
            });
            if (score > maxScore) {
                maxScore = score;
                bestChunk = chunk;
            }
        });

        return bestChunk;
    }
};
