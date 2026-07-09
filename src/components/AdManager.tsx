import { AdMetadata } from '@/types/ad';
import { 
  Tag, 
  Video, 
  User, 
  UserCircle2, 
  Baby, 
  Briefcase,
  Smile,
  RefreshCw,
  ListVideo,
  Shield,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface AdManagerProps {
  ads: AdMetadata[];
  lastSyncTimestamp: number | null;
  onRefresh: () => void;
}

/**
 * Read-only playlist viewer.
 * Ads are managed by the admin in the backend.
 * This component only displays the current playlist and allows refreshing.
 */
export const AdManager = ({ 
  ads, 
  lastSyncTimestamp,
  onRefresh,
}: AdManagerProps) => {

  const formatTimeSince = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ListVideo className="h-4 w-4" />
          View Playlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Playlist
            <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Shield className="h-3 w-3" />
              Managed by Admin
            </span>
          </DialogTitle>
          <DialogDescription>
            Playlist is configured by the admin. Refresh to pull the latest changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sync Info & Refresh */}
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2.5 border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last synced: <span className="font-medium text-foreground">{formatTimeSince(lastSyncTimestamp)}</span></span>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          {/* Playlist Items */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Playlist ({ads.length})
              </span>
            </h4>

            {ads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No playlist configured</p>
                <p className="text-sm mt-1">Admin needs to set up ads in the backend.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {ads.map((ad) => (
                  <div 
                    key={ad.id}
                    className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Video className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{ad.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <TargetBadge type="gender" value={ad.gender} />
                        {(Array.isArray(ad.ageGroup) ? ad.ageGroup : [ad.ageGroup]).map(age => (
                          <TargetBadge key={age} type="age" value={age as string} />
                        ))}
                        <span className="text-xs text-muted-foreground">
                          {ad.duration}s
                        </span>
                        {ad.video_path && (
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={ad.video_path}>
                            📁 {ad.video_path}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface TargetBadgeProps {
  type: 'gender' | 'age';
  value: string;
}

const TargetBadge = ({ type, value }: TargetBadgeProps) => {
  const getIcon = () => {
    if (type === 'gender') {
      return value === 'male' ? <User className="h-3 w-3" /> 
           : value === 'female' ? <UserCircle2 className="h-3 w-3" />
           : null;
    }
    return value === 'child' ? <Smile className="h-3 w-3" />
         : value === 'teen' ? <Baby className="h-3 w-3" />
         : value === 'youngAdult' ? <Baby className="h-3 w-3" /> 
         : value === 'middleAged' ? <Briefcase className="h-3 w-3" />
         : value === 'senior' ? <Briefcase className="h-3 w-3" />
         : null;
  };

  const getColor = () => {
    if (type === 'gender') {
      return value === 'male' ? 'bg-primary/20 text-primary'
           : value === 'female' ? 'bg-accent/20 text-accent'
           : 'bg-muted text-muted-foreground';
    }
    return value === 'child' ? 'bg-info/20 text-info'
         : value === 'teen' ? 'bg-accent/20 text-accent'
         : value === 'youngAdult' ? 'bg-success/20 text-success'
         : value === 'middleAged' ? 'bg-warning/20 text-warning'
         : value === 'senior' ? 'bg-destructive/20 text-destructive'
         : 'bg-muted text-muted-foreground';
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
      getColor()
    )}>
      {getIcon()}
      <span className="capitalize">{value}</span>
    </div>
  );
};
