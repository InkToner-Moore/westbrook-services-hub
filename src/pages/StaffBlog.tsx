import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Megaphone,
  Search,
  Plus,
  Trash2,
  Edit,
  Eye,
  Calendar,
  User as UserIcon,
  Tag,
  FileText,
  Globe,
  Archive
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { useBlogPosts } from "@/hooks/useGoogleSheets";
import StaffLayout from "@/components/StaffLayout";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  status: "draft" | "published" | "archived";
  publishDate: string;
  author: string;
  tags: string[];
}

const StaffBlog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const { themeClasses } = useTheme();
  const { data: blogPosts, loading, addItem, updateItem, deleteItem } = useBlogPosts();
  
  const newPostForm = useForm<Omit<BlogPost, 'id' | 'author'>>();
  const editForm = useForm<BlogPost>();

  const getStatusColor = (status: BlogPost['status']) => {
    switch (status) {
      case "published": return "bg-green-500/20 text-green-300 border-green-400/50";
      case "draft": return "bg-yellow-500/20 text-yellow-300 border-yellow-400/50";
      case "archived": return "bg-gray-500/20 text-gray-300 border-gray-400/50";
      default: return "bg-blue-500/20 text-blue-300 border-blue-400/50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published": return <Globe className="h-4 w-4" />;
      case "draft": return <FileText className="h-4 w-4" />;
      case "archived": return <Archive className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const addNewPost = async (data: Omit<BlogPost, 'id' | 'author'>) => {
    try {
      const newPost = await addItem({
        ...data,
        author: "Staff",
        tags: data.tags || []
      });
      
      newPostForm.reset();
      
      toast({
        title: "Post Created",
        description: `"${newPost.title}" has been ${data.status === 'published' ? 'published' : 'saved as draft'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      });
    }
  };

  const updatePost = async (data: BlogPost) => {
    try {
      await updateItem(data.id, data);
      setEditingPost(null);
      
      toast({
        title: "Post Updated",
        description: `"${data.title}" has been updated`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive"
      });
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await deleteItem(postId);
      toast({
        title: "Post Deleted",
        description: `Post ${postId} has been removed`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      });
    }
  };

  const publishPost = async (post: BlogPost) => {
    try {
      await updateItem(post.id, {
        ...post,
        status: "published",
        publishDate: new Date().toISOString().split('T')[0]
      });
      
      toast({
        title: "Post Published",
        description: `"${post.title}" is now live on the website`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish post",
        variant: "destructive"
      });
    }
  };

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || post.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const publishedPosts = blogPosts.filter(post => post.status === "published");
  const draftPosts = blogPosts.filter(post => post.status === "draft");
  const archivedPosts = blogPosts.filter(post => post.status === "archived");

  if (loading) {
    return (
      <StaffLayout
        title="Blog & Announcements"
        icon={Megaphone}
        iconColor="from-pink-400 to-rose-600"
      >
        <div className="flex items-center justify-center h-64">
          <div className={`text-center ${themeClasses.text.muted}`}>
            <Megaphone className="h-12 w-12 mx-auto mb-4 animate-pulse" />
            <p>Loading blog posts...</p>
          </div>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout
      title="Blog & Announcements"
      icon={Megaphone}
      iconColor="from-pink-400 to-rose-600"
    >
      <div className="text-center mb-12">
        <h2 className={`text-4xl font-bold mb-4 drop-shadow-2xl transition-all duration-500 ${themeClasses.text.primary}`}>
          Blog & Announcements
        </h2>
        <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-all duration-500 ${themeClasses.text.muted}`}>
          Manage customer-facing updates and announcements
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium transition-all duration-500 ${themeClasses.text.secondary}`}>Published</p>
                <p className={`text-2xl font-bold transition-all duration-500 ${themeClasses.text.primary}`}>{publishedPosts.length}</p>
              </div>
              <Globe className={`h-8 w-8 transition-all duration-500 ${themeClasses.text.secondary}`} />
            </div>
          </CardContent>
        </Card>
        
        <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium transition-all duration-500 ${themeClasses.text.secondary}`}>Drafts</p>
                <p className={`text-2xl font-bold transition-all duration-500 ${themeClasses.text.primary}`}>{draftPosts.length}</p>
              </div>
              <FileText className={`h-8 w-8 transition-all duration-500 ${themeClasses.text.secondary}`} />
            </div>
          </CardContent>
        </Card>
        
        <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium transition-all duration-500 ${themeClasses.text.secondary}`}>Archived</p>
                <p className={`text-2xl font-bold transition-all duration-500 ${themeClasses.text.primary}`}>{archivedPosts.length}</p>
              </div>
              <Archive className={`h-8 w-8 transition-all duration-500 ${themeClasses.text.secondary}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className={`grid w-full grid-cols-2 mb-8 backdrop-blur-sm transition-all duration-500 ${themeClasses.card}`}>
          <TabsTrigger 
            value="posts" 
            className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-600 data-[state=active]:text-white"
          >
            <Megaphone className="h-4 w-4" />
            <span>All Posts</span>
          </TabsTrigger>
          <TabsTrigger 
            value="create" 
            className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
          >
            <Plus className="h-4 w-4" />
            <span>Create Post</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          {/* Search and Filter */}
          <div className="mb-6 flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-3 h-4 w-4 transition-all duration-500 ${themeClasses.text.secondary}`} />
              <Input
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 transition-all duration-500 ${themeClasses.input}`}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === "all" ? "default" : "ghost"}
                onClick={() => setStatusFilter("all")}
                className={themeClasses.button.ghost}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "published" ? "default" : "ghost"}
                onClick={() => setStatusFilter("published")}
                className={themeClasses.button.ghost}
              >
                Published
              </Button>
              <Button
                variant={statusFilter === "draft" ? "default" : "ghost"}
                onClick={() => setStatusFilter("draft")}
                className={themeClasses.button.ghost}
              >
                Drafts
              </Button>
              <Button
                variant={statusFilter === "archived" ? "default" : "ghost"}
                onClick={() => setStatusFilter("archived")}
                className={themeClasses.button.ghost}
              >
                Archived
              </Button>
            </div>
          </div>

          {/* Posts List */}
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <Card key={post.id} className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className={`mb-2 transition-all duration-500 ${themeClasses.text.primary}`}>
                        {post.title}
                      </CardTitle>
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={`${getStatusColor(post.status)} border text-xs`}>
                          {getStatusIcon(post.status)}
                          <span className="ml-1">{post.status}</span>
                        </Badge>
                        <div className={`flex items-center text-xs transition-all duration-500 ${themeClasses.text.secondary}`}>
                          <Calendar className="h-3 w-3 mr-1" />
                          {post.publishDate}
                        </div>
                        <div className={`flex items-center text-xs transition-all duration-500 ${themeClasses.text.secondary}`}>
                          <UserIcon className="h-3 w-3 mr-1" />
                          {post.author}
                        </div>
                      </div>
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex items-center space-x-1 mb-2">
                          <Tag className={`h-3 w-3 transition-all duration-500 ${themeClasses.text.secondary}`} />
                          {post.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {post.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => publishPost(post)}
                          className={`text-green-300 hover:text-white hover:bg-green-500/20 transition-all duration-500`}
                        >
                          <Globe className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingPost(editingPost === post.id ? null : post.id);
                          editForm.reset(post);
                        }}
                        className={`text-blue-300 hover:text-white hover:bg-blue-500/20 transition-all duration-500`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePost(post.id)}
                        className={`text-red-300 hover:text-white hover:bg-red-500/20 transition-all duration-500`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className={`transition-all duration-500 ${themeClasses.text.muted}`}>
                    {post.excerpt}
                  </p>
                </CardContent>
              </Card>
            ))}
            
            {filteredPosts.length === 0 && (
              <div className="text-center py-12">
                <Megaphone className={`h-16 w-16 mx-auto mb-4 opacity-50 transition-all duration-500 ${themeClasses.text.secondary}`} />
                <h3 className={`text-xl font-semibold mb-2 transition-all duration-500 ${themeClasses.text.primary}`}>No posts found</h3>
                <p className={`transition-all duration-500 ${themeClasses.text.muted}`}>
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Create your first blog post or announcement'
                  }
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="create">
          <Card className={`backdrop-blur-xl shadow-2xl max-w-4xl mx-auto transition-all duration-500 ${themeClasses.card}`}>
            <CardHeader>
              <CardTitle className={`flex items-center space-x-2 transition-all duration-500 ${themeClasses.text.primary}`}>
                <Plus className="h-5 w-5" />
                <span>Create New Post</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={newPostForm.handleSubmit(addNewPost)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Title</Label>
                    <Input
                      {...newPostForm.register('title', { required: true })}
                      placeholder="Post title..."
                      className={`transition-all duration-500 ${themeClasses.input}`}
                    />
                  </div>
                  
                  <div>
                    <Label className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Status</Label>
                    <select 
                      {...newPostForm.register('status', { required: true })}
                      className={`w-full p-2 rounded-md border transition-all duration-500 ${themeClasses.input}`}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Publish Date</Label>
                    <Input
                      {...newPostForm.register('publishDate', { required: true })}
                      type="date"
                      className={`transition-all duration-500 ${themeClasses.input}`}
                    />
                  </div>
                </div>
                
                <div>
                  <Label className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Excerpt</Label>
                  <Textarea
                    {...newPostForm.register('excerpt', { required: true })}
                    placeholder="Brief summary for preview..."
                    className={`min-h-[80px] transition-all duration-500 ${themeClasses.input}`}
                  />
                </div>
                
                <div>
                  <Label className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Content</Label>
                  <Textarea
                    {...newPostForm.register('content', { required: true })}
                    placeholder="Write your post content here..."
                    className={`min-h-[200px] transition-all duration-500 ${themeClasses.input}`}
                  />
                </div>
                
                <div>
                  <Label className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Tags (comma-separated)</Label>
                  <Input
                    {...newPostForm.register('tags')}
                    placeholder="announcement, update, news..."
                    className={`transition-all duration-500 ${themeClasses.input}`}
                  />
                </div>
                
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-pink-500/25 transition-all duration-300 hover:scale-105"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Post
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </StaffLayout>
  );
};

export default StaffBlog;