import Link from "next/link";

const EXAMPLES = [
  {
    type: "Wedding Highlight",
    style: "Romantic · Cinematic · Warm · Soft Piano",
    prompt: "I want a romantic wedding highlight video from my raw footage. Make it emotional, elegant, and cinematic. Use warm colors, smooth transitions, romantic piano music, and clean minimal text. Focus on the bride and groom entrance, family moments, ring exchange, and emotional smiles. Remove shaky parts, boring pauses, and duplicate clips. Final video should be vertical 9:16 for Instagram Reels, around 60 seconds, with simple English captions.",
    package: "Plus",
  },
  {
    type: "Graduation",
    style: "Emotional · Inspiring · Warm · Orchestral",
    prompt: "Create an inspiring graduation highlight video. Make it emotional and motivating with warm color grading. Include the diploma ceremony, family hugs, group photos, and celebratory moments. Use inspiring orchestral music. Cut all blurry or low-quality footage. Deliver as 16:9 YouTube-ready video, 2–3 minutes, 1080p, with clean lower-third title showing the graduate's name.",
    package: "Plus",
  },
  {
    type: "Business Promo",
    style: "Professional · Clean · Corporate · Confident",
    prompt: "Edit this business promo video to look premium and professional. Style: clean corporate. Use cool-neutral color grade, smooth transitions, and confident background music. Highlight our product features, team, and client testimonials. Add bold lower-thirds for key stats and team names. Cut all filler content. Final: 16:9, 90 seconds, 1080p, for LinkedIn and YouTube.",
    package: "Basic",
  },
  {
    type: "YouTube Long-Form",
    style: "Casual · Creator · Engaging · Lo-fi",
    prompt: "Edit this YouTube tutorial into an engaging video. Style: social media creator — casual but professional. Use jump cuts to remove pauses, add subtle zoom-ins on key points, and include energetic background music. Add chapter titles as text overlays. Keep it dynamic and under 10 minutes from 45 minutes of raw footage. 16:9, 1080p, 30fps, with styled captions.",
    package: "Premium",
  },
  {
    type: "TikTok / Instagram Reels",
    style: "Fast · Viral · Bold · Energetic",
    prompt: "Make a viral-style short video from my footage. Fast cuts, bold text overlays, trending music or energetic beat. Use a hook in the first 2 seconds. Vertical 9:16, 30–45 seconds max. Bright color grade. Bold caption style. Platform: TikTok. Make it impossible to skip.",
    package: "Basic",
  },
  {
    type: "Real Estate Luxury",
    style: "Luxury · Elegant · Clean · Piano",
    prompt: "Create a luxury real estate showcase video. Style: high-end luxury. Slow motion exterior shots, smooth interior walkthroughs, gentle piano music. Use 'Luxury gold' color grade. Add elegant lower-thirds for room names and property features. No talking head or voiceover needed. Final: 16:9, 90 seconds, 1080p, for the property website and Instagram.",
    package: "Plus",
  },
  {
    type: "Podcast Clip",
    style: "Clean · Professional · Minimal · Corporate",
    prompt: "Extract the best 90-second highlight clip from this 45-minute podcast recording. Find the most insightful quote or story moment. Add bold captions so it works without sound. Use corporate uplifting background music at low volume. Vertical 9:16 for Instagram Reels and TikTok. Clean color grade. Speaker's name as lower-third.",
    package: "Basic",
  },
];

export default function PromptExamplesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mb-10 text-center sm:mb-16">
        <h1 className="mb-4 text-4xl font-black sm:text-5xl">Prompt Examples</h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
          These are example prompts you can use or adapt. The order form generates a prompt automatically from your selections — you just refine it.
        </p>
      </div>

      <div className="space-y-6">
        {EXAMPLES.map(({ type, style, prompt, package: pkg }) => (
          <div key={type} className="glass rounded-2xl border border-white/5 p-5 sm:p-8">
            <div className="mb-4 flex flex-col items-start justify-between gap-3 min-[480px]:flex-row min-[480px]:gap-4">
              <div>
                <div className="font-bold text-lg">{type}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{style}</div>
              </div>
              <span className="glass flex min-h-8 flex-shrink-0 items-center rounded-full border border-white/10 px-3 text-xs font-semibold">{pkg}</span>
            </div>
            <div className="bg-white/3 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-muted-foreground leading-relaxed italic">&ldquo;{prompt}&rdquo;</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass mt-10 rounded-2xl border border-gold-500/20 p-5 text-center sm:mt-12 sm:p-6">
        <p className="text-muted-foreground mb-4">You don&apos;t need to write a perfect prompt. Our order form generates one from your selections.</p>
        <Link href="/order" className="gold-gradient inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 font-bold text-black sm:w-auto">
          Start Your Order →
        </Link>
      </div>
    </div>
  );
}
