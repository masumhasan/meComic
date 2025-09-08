import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, Modality } from "@google/genai";

type View = 'dashboard' | 'generator' | 'loading' | 'viewer' | 'error';
type DashboardTab = 'adventures' | 'education' | 'science';
type ItemType = 'recent' | 'starter' | 'education' | 'science';

interface ComicPanelData {
  panel_number: number;
  scene_description: string;
  dialogue: string;
}

// --- MOCK DATA STRUCTURES & INITIAL VALUES ---
interface StoryCardData {
  id: number;
  title: string;
  tag: string;
  status?: 'Complete' | 'Reading';
  imageUrl: string | null;
}

const initialRecentAdventures: StoryCardData[] = [
  { id: 1, title: 'Space Adventure with Captain Luna', tag: 'Space', status: 'Complete', imageUrl: null },
  { id: 2, title: 'The Magical Forest Quest', tag: 'Forest', status: 'Reading', imageUrl: null },
  { id: 3, title: 'Mystery of the Missing Toy', tag: 'Detective', status: 'Complete', imageUrl: null },
];

const initialStoryStarters: StoryCardData[] = [
  { id: 1, title: 'A Dragon for a Pet', tag: 'Fantasy', imageUrl: null },
  { id: 2, title: 'The Underwater City of Aquaria', tag: 'Sci-Fi', imageUrl: null },
  { id: 3, title: 'Talking Animals on a Farm', tag: 'Adventure', imageUrl: null },
];

const initialEducationStories: StoryCardData[] = [
  { id: 1, title: 'The Journey of a Water Droplet', tag: 'Science', imageUrl: null },
  { id: 2, title: 'Counting with Caterpillars', tag: 'Math', imageUrl: null },
  { id: 3, title: 'A Trip Through the Solar System', tag: 'Astronomy', imageUrl: null },
];

const initialScienceStories: StoryCardData[] = [
  { id: 1, title: 'The Secret Life of Plants', tag: 'Biology', imageUrl: null },
  { id: 2, title: 'Journey to the Center of the Earth', tag: 'Geology', imageUrl: null },
  { id: 3, title: 'Building a Simple Robot', tag: 'Engineering', imageUrl: null },
];

const stats = [
  { id: 1, value: 12, label: 'Stories Created', icon: '⭐', color: 'yellow' },
  { id: 2, value: 8, label: 'Completed', icon: '📖', color: 'blue' },
  { id: 3, value: 47, label: 'Reading Hours', icon: '💜', color: 'purple' },
  { id: 4, value: 5, label: 'Favorite Themes', icon: '▶️', color: 'green' },
];


const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  
  const [childName, setChildName] = useState<string>('');
  const [storyContext, setStoryContext] = useState<string>('');
  const [faceImage, setFaceImage] = useState<File | null>(null);
  const [faceImageDataUrl, setFaceImageDataUrl] = useState<string | null>(null);

  const [story, setStory] = useState<ComicPanelData[] | null>(null);
  const [comicImages, setComicImages] = useState<string[]>([]);
  const [currentPanelIndex, setCurrentPanelIndex] = useState<number>(0);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // State for dashboard content
  const [activeTab, setActiveTab] = useState<DashboardTab>('adventures');
  const [recentAdventures, setRecentAdventures] = useState<StoryCardData[]>(initialRecentAdventures);
  const [storyStarters, setStoryStarters] = useState<StoryCardData[]>(initialStoryStarters);
  const [educationStories, setEducationStories] = useState<StoryCardData[]>(initialEducationStories);
  const [scienceStories, setScienceStories] = useState<StoryCardData[]>(initialScienceStories);
  const [thumbnailStatus, setThumbnailStatus] = useState<Record<string, 'loading' | 'error'>>({});

  const generateThumbnail = async (item: StoryCardData, itemType: ItemType) => {
    const key = `${itemType}-${item.id}`;
    setThumbnailStatus(prev => ({ ...prev, [key]: 'loading' }));

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const prompt = `A kid-friendly comic book cover for a story titled '${item.title}'. Vibrant colors, cartoon style, no text.`;
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '4:3',
            },
        });
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/png;base64,${base64ImageBytes}`;

        const getSetter = (type: ItemType) => {
          switch (type) {
            case 'recent': return setRecentAdventures;
            case 'starter': return setStoryStarters;
            case 'education': return setEducationStories;
            case 'science': return setScienceStories;
            default: return setRecentAdventures;
          }
        };

        const setter = getSetter(itemType);
        setter(prevItems => prevItems.map(prevItem =>
            prevItem.id === item.id ? { ...prevItem, imageUrl: imageUrl } : prevItem
        ));
        
        setThumbnailStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[key];
            return newStatus;
        });

    } catch (err) {
        console.error(`Failed to generate thumbnail for "${item.title}":`, err);
        setThumbnailStatus(prev => ({ ...prev, [key]: 'error' }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFaceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaceImageDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetState = () => {
    setChildName('');
    setStoryContext('');
    setFaceImage(null);
    setFaceImageDataUrl(null);
    setStory(null);
    setComicImages([]);
    setCurrentPanelIndex(0);
    setError(null);
    setView('dashboard');
  }

  const generateComic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName || !storyContext || !faceImage) {
      setError('Please fill in all fields and upload an image.');
      setView('error');
      return;
    }
    
    setView('loading');
    setError(null);
    setStory(null);
    setComicImages([]);
    setCurrentPanelIndex(0);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      setLoadingMessage('Crafting a unique story for you...');
      const storyPrompt = `
        You are a creative children’s story writer.
        - Main character: ${childName}
        - Story Context: ${storyContext}
        - Target audience: kids 4-8 years old
        - Story length: 4 panels max
        - Style: fun, imaginative, with simple dialogue and narration
      `;
      
      const storyResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: storyPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                panel_number: { type: Type.NUMBER },
                scene_description: { type: Type.STRING },
                dialogue: { type: Type.STRING },
              },
              required: ["panel_number", "scene_description", "dialogue"],
            },
          },
        },
      });

      const storyData: ComicPanelData[] = JSON.parse(storyResponse.text);
      if (!storyData || storyData.length === 0) {
        throw new Error('Could not generate story data.');
      }
      setStory(storyData);

      const generatedImages: string[] = [];
      const imagePart = await fileToGenerativePart(faceImage);

      for (const panel of storyData) {
        setLoadingMessage(`Drawing comic panel ${panel.panel_number} of ${storyData.length}...`);
        
        const imagePrompt = `
          Create a comic panel in a kid-friendly cartoon style.
          - Main character: A child named ${childName} who looks like the person in the provided image.
          - Scene: ${panel.scene_description}
          - Dialogue: "${panel.dialogue}" should be in a speech bubble in the panel.
          - Style: bright, colorful, simple comic book art for children.
        `;

        const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    imagePart,
                    { text: imagePrompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        let imageUrl = '';
        for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            break;
          }
        }

        if (imageUrl) {
            generatedImages.push(imageUrl);
        } else {
            console.warn(`Could not find image in response for panel ${panel.panel_number}`);
            generatedImages.push(''); 
        }
        setComicImages([...generatedImages]);
      }
      setView('viewer');
    } catch (err) {
      console.error(err);
      setError(`An error occurred: ${err instanceof Error ? err.message : String(err)}`);
      setView('error');
    } finally {
      setLoadingMessage('');
    }
  };
  
  const currentPanel = story ? story[currentPanelIndex] : null;
  const currentImage = comicImages[currentPanelIndex];

  const StoryCarouselSection: React.FC<{
    title: string;
    stories: StoryCardData[];
    itemType: ItemType;
  }> = ({ title, stories, itemType }) => (
      <section className="story-section">
        <div className="section-header">
          <h2>{title}</h2>
          <a href="#" className="view-all">View all</a>
        </div>
        <div className="story-carousel">
          {stories.map(story => {
            const key = `${itemType}-${story.id}`;
            const status = thumbnailStatus[key];
            return (
              <div key={story.id} className="comic-card">
                <div className="comic-card-image">
                  {story.imageUrl ?
                    <img src={story.imageUrl} alt={story.title} /> :
                    <div className="thumbnail-placeholder">
                      {status === 'loading' && <div className="spinner-small"></div>}
                      {status === 'error' && (
                        <div className="thumbnail-action">
                          <p>Error</p>
                          <button onClick={() => generateThumbnail(story, itemType)} className="btn-retry-thumb">Retry</button>
                        </div>
                      )}
                      {!status && (
                        <button onClick={() => generateThumbnail(story, itemType)} className="btn-generate-thumb">
                          <span role="img" aria-label="art palette">🎨</span> Generate
                        </button>
                      )}
                    </div>
                  }
                  {story.status && <span className={`status-tag ${story.status.toLowerCase()}`}>{story.status}</span>}
                </div>
                <div className="comic-card-info">
                  <h3 className="comic-card-title">{story.title}</h3>
                  <p className="comic-card-tag">{story.tag}</p>
                  {story.status ? (
                    <button className="btn-card-action">
                      {story.status === 'Reading' ? '▶ Continue' : '▷ Read'}
                    </button>
                  ) : (
                    <button className="btn-card-action">✨ Start with this idea</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
  );

  const renderDashboard = () => (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <span className="icon" role="img" aria-label="laughing emoji">🤣</span>
        <div>
          <h1>Welcome back, Alex!</h1>
          <p>Ready for a new adventure?</p>
        </div>
      </header>
      <div className="dashboard-actions">
        <button className="action-card create-new-card" onClick={() => setView('generator')}>
          <span className="icon" role="img" aria-label="plus icon">➕</span>
          <div className="action-card-text">
            <h2>Create New Comic</h2>
            <p>AI-powered comic generator</p>
          </div>
        </button>
        <button className="action-card my-stories-card">
          <span className="icon" role="img" aria-label="book icon">📖</span>
          <div className="action-card-text">
            <h2>My Stories</h2>
            <p>Continue reading</p>
          </div>
        </button>
      </div>
      
      <nav className="dashboard-tabs">
        <button className={`tab-button ${activeTab === 'adventures' ? 'active' : ''}`} onClick={() => setActiveTab('adventures')}>Adventures</button>
        <button className={`tab-button ${activeTab === 'education' ? 'active' : ''}`} onClick={() => setActiveTab('education')}>Education</button>
        <button className={`tab-button ${activeTab === 'science' ? 'active' : ''}`} onClick={() => setActiveTab('science')}>Science</button>
      </nav>

      <div className="tab-content">
        {activeTab === 'adventures' && (
          <>
            <StoryCarouselSection title="Your Recent Adventures" stories={recentAdventures} itemType="recent" />
            <StoryCarouselSection title="Get Inspired" stories={storyStarters} itemType="starter" />
          </>
        )}
        {activeTab === 'education' && (
          <StoryCarouselSection title="Learn Something New" stories={educationStories} itemType="education" />
        )}
        {activeTab === 'science' && (
          <StoryCarouselSection title="Explore the World of Science" stories={scienceStories} itemType="science" />
        )}
      </div>

      <section className="stats-grid">
        {stats.map(stat => (
          <div key={stat.id} className={`stat-card stat-card-${stat.color}`}>
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-value">{stat.value}</div>
              <p className="stat-label">{stat.label}</p>
          </div>
        ))}
      </section>
    </div>
  );


  const renderGenerator = () => (
    <>
      <button onClick={() => setView('dashboard')} className="back-btn">&larr; Back to Dashboard</button>
      <div className="form-container">
        <div className="form-header">
          <h1>Create Your Comic</h1>
        </div>
        <form onSubmit={generateComic} className="form-grid">
          <div className="form-group">
            <label htmlFor="childName">Child's Name</label>
            <input
              id="childName" type="text" value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="e.g., Sanav" required aria-label="Child's Name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="storyContext">Story Context</label>
            <input
              id="storyContext" type="text" value={storyContext}
              onChange={(e) => setStoryContext(e.target.value)}
              placeholder="e.g., A brave knight afraid of the dark" required aria-label="Story Context"
            />
          </div>
          <div className="image-upload">
            <div className="image-preview" aria-label="Image preview">
                {faceImageDataUrl ? (
                    <img src={faceImageDataUrl} alt="Face preview" />
                ) : (
                    <span>Upload a cartoon face</span>
                )}
            </div>
            <label htmlFor="faceImage" className="btn btn-secondary">Choose Image</label>
            <input
              id="faceImage" type="file" accept="image/*"
              onChange={handleImageChange} required aria-label="Upload face image"
            />
          </div>
          <button type="submit" className="btn btn-primary">✨ Create My Comic</button>
        </form>
      </div>
    </>
  );

  const renderStatus = (isError: boolean) => (
    <div className={`status-container ${isError ? 'error' : ''}`} role={isError ? "alert" : "status"} aria-live="polite">
      {!isError && <div className="spinner"></div>}
      <p>{isError ? error : loadingMessage}</p>
      {isError && <button onClick={resetState} className="btn btn-secondary">Try Again</button>}
    </div>
  );

  const renderViewer = () => (
    <div className="comic-viewer">
      {currentPanel && (
        <>
          <div className="comic-panel">
            <div className="panel-image">
              {currentImage ? <img src={currentImage} alt={`Panel ${currentPanel.panel_number}: ${currentPanel.scene_description}`} /> : <div className="spinner"></div>}
            </div>
            <div className="panel-text">
              <h3>Panel {currentPanel.panel_number}</h3>
              <p><strong>Scene:</strong> {currentPanel.scene_description}</p>
              <p><strong>Dialogue:</strong> "{currentPanel.dialogue}"</p>
            </div>
          </div>
          <div className="comic-nav">
              <button onClick={() => setCurrentPanelIndex(prev => prev - 1)} disabled={currentPanelIndex === 0} className="btn btn-nav">&larr; Previous</button>
              <span>Panel {currentPanelIndex + 1} of {story!.length}</span>
              <button onClick={() => setCurrentPanelIndex(prev => prev + 1)} disabled={currentPanelIndex === story!.length - 1} className="btn btn-nav">Next &rarr;</button>
          </div>
        </>
      )}
      <button onClick={resetState} className="btn btn-primary create-new-btn">Create New Comic</button>
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return renderDashboard();
      case 'generator':
        return renderGenerator();
      case 'loading':
        return renderStatus(false);
      case 'error':
        return renderStatus(true);
      case 'viewer':
        return renderViewer();
      default:
        return renderDashboard();
    }
  };

  return <div className="container">{renderContent()}</div>;
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);