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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black mb-4">Prompt Examples</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          These are example prompts you can use or adapt. The order form generates a prompt automatically from your selections — you just refine it.
        </p>
      </div>

      <div className="space-y-6">
        {EXAMPLES.map(({ type, style, prompt, package: pkg }) => (
          <div key={type} className="glass border border-white/5 rounded-2xl p-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="font-bold text-lg">{type}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{style}</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold glass border border-white/10 flex-shrink-0">{pkg}</span>
            </div>
            <div className="bg-white/3 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-muted-foreground leading-relaxed italic">"{prompt}"</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 glass border border-gold-500/20 rounded-2xl text-center">
        <p className="text-muted-foreground mb-4">You don't need to write a perfect prompt. Our order form generates one from your selections.</p>
        <a href="/order" className="inline-flex items-center gap-2 px-6 py-3 gold-gradient text-black font-bold rounded-xl">
          Start Your Order →
        </a>
      </div>
    </div>
  );
}
