import { useState, useEffect, useRef } from 'react';
import {
    Upload,
    Camera,
    Link as LinkIcon,
    FileText,
    Database,
    MessageSquare,
    ChevronRight,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { API_ENDPOINTS, buildAuthHeaders } from '@/utils/config';

interface Tool {
    id: string;
    name: string;
    description?: string;
    icon?: string;
}

interface ToolsMenuProps {
    onToolSelect: (tool: Tool) => void;
    onFileUpload?: (file: File) => void;
}

export function ToolsMenu({ onToolSelect, onFileUpload }: ToolsMenuProps) {
    const [tools, setTools] = useState<Tool[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchTools();
    }, []);

    const fetchTools = async () => {
        setIsLoading(true);
        try {
            const toolsUrl = API_ENDPOINTS.tools.list();
            const response = await fetch(toolsUrl, {
                headers: {
                    ...buildAuthHeaders(),
                },
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    setTools(data);
                }
            }
        } catch (error) {
            console.error('Failed to fetch tools:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Default tools (fallback)
    const defaultTools = [
        { id: 'upload', name: 'Upload Files', icon: 'upload' },
        { id: 'capture', name: 'Capture', icon: 'camera' },
        { id: 'webpage', name: 'Attach Webpage', icon: 'link' },
        { id: 'notes', name: 'Attach Notes', icon: 'filetext' },
        { id: 'knowledge', name: 'Attach Knowledge', icon: 'database' },
        { id: 'reference', name: 'Reference Chats', icon: 'message' },
    ];

    const getIcon = (iconName?: string) => {
        switch (iconName?.toLowerCase()) {
            case 'upload':
                return <Upload className="h-4 w-4" />;
            case 'camera':
                return <Camera className="h-4 w-4" />;
            case 'link':
                return <LinkIcon className="h-4 w-4" />;
            case 'filetext':
                return <FileText className="h-4 w-4" />;
            case 'database':
                return <Database className="h-4 w-4" />;
            case 'message':
                return <MessageSquare className="h-4 w-4" />;
            default:
                return <ChevronRight className="h-4 w-4" />;
        }
    };

    const handleToolClick = (tool: Tool) => {
        if (tool.id === 'upload') {
            // Trigger file input
            fileInputRef.current?.click();
        } else {
            onToolSelect(tool);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            onFileUpload?.(file);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const displayTools = tools.length > 0 ? tools : defaultTools;

    return (
        <>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="*/*"
            />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 8v8" />
                            <path d="M8 12h8" />
                        </svg>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    side="top"
                    className="w-64 bg-card border-border"
                >
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        Attach to message
                    </div>
                    <DropdownMenuSeparator />
                    {displayTools.map((tool, index) => (
                        <DropdownMenuItem
                            key={tool.id || index}
                            onClick={() => handleToolClick(tool)}
                            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent"
                        >
                            <div className="text-muted-foreground">
                                {getIcon(tool.icon)}
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-medium text-foreground">
                                    {tool.name}
                                </div>
                                {tool.description && (
                                    <div className="text-xs text-muted-foreground">
                                        {tool.description}
                                    </div>
                                )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
