import { db } from './src/lib/firebase.ts';
import { collection, addDoc } from 'firebase/firestore';

async function seed() {
  console.log("Seeding a long blog post...");
  await addDoc(collection(db, "blogs"), {
    title: "On the nature of Adab",
    content: `<p>Adab (أدب) in the context of behavior refers to prescribed Islamic etiquette: "refinement, good manners, morals, ethics, decorum, decency, humaneness and righteousness."</p><p>While interpretation of the scope and particulars of Adab may vary among different cultures, common among these interpretations is regard for personal standing through the observation of certain codes of behavior.</p><p>The concept of Adab is extensive, serving as a guideline for personal conduct and one’s relationship with others. When applied to literature, Adab refers to the belles-lettres of Arabic, Persian, and Urdu literary traditions. It suggests that literature must not merely entertain, but it must refine the intellect, shape the moral compass, and deepen our understanding of the universe.</p><p>Here at The Muted Void, we emphasize Adab as an aesthetic philosophy. It’s the silence between words, the respectful pause before an answer, and the conscious consumption of art. In an era of instant gratification, Adab forces us to slow down. To read slowly. To understand deeply.</p><p>The root letters Ain, Sheen, Qaf form Ishq, which goes hand-in-hand with Adab. One cannot truly possess Ishq without the refinement of Adab. The lover must know how to stand before the beloved; the reader must know how to sit with the text.</p>`,
    createdAt: new Date()
  });
  console.log("Done seeding long blog.");
  process.exit(0);
}

seed().catch(console.error);
