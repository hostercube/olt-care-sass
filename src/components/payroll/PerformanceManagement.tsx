import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Plus, Star, Loader2, Eye, Edit } from 'lucide-react';
import { format } from 'date-fns';
import type { Staff, PerformanceReview } from '@/hooks/usePayrollSystem';

interface PerformanceManagementProps {
  staff: Staff[];
  reviews: PerformanceReview[];
  loading: boolean;
  onSaveReview: (data: Partial<PerformanceReview>, id?: string) => Promise<void>;
}

const RATING_CRITERIA = [
  { key: 'quality', label: 'Work Quality', description: 'Accuracy and thoroughness of work' },
  { key: 'productivity', label: 'Productivity', description: 'Efficiency and output volume' },
  { key: 'communication', label: 'Communication', description: 'Clarity and effectiveness' },
  { key: 'teamwork', label: 'Teamwork', description: 'Collaboration with colleagues' },
  { key: 'punctuality', label: 'Punctuality', description: 'Attendance and timeliness' },
  { key: 'initiative', label: 'Initiative', description: 'Proactive behavior and problem solving' },
];

export function PerformanceManagement({ staff, reviews, loading, onSaveReview }: PerformanceManagementProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingReview, setEditingReview] = useState<PerformanceReview | null>(null);
  const [viewingReview, setViewingReview] = useState<PerformanceReview | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    staff_id: '',
    review_period: format(new Date(), 'yyyy-MM'),
    ratings: {} as Record<string, number>,
    strengths: '',
    areas_for_improvement: '',
    goals: '',
    comments: '',
    status: 'draft' as 'draft' | 'submitted' | 'acknowledged'
  });

  const resetForm = () => {
    setForm({
      staff_id: '',
      review_period: format(new Date(), 'yyyy-MM'),
      ratings: {},
      strengths: '',
      areas_for_improvement: '',
      goals: '',
      comments: '',
      status: 'draft'
    });
  };

  const handleEdit = (review: PerformanceReview) => {
    setEditingReview(review);
    setForm({
      staff_id: review.staff_id,
      review_period: review.review_period,
      ratings: review.ratings || {},
      strengths: review.strengths || '',
      areas_for_improvement: review.areas_for_improvement || '',
      goals: review.goals || '',
      comments: review.comments || '',
      status: review.status
    });
    setShowDialog(true);
  };

  const handleView = (review: PerformanceReview) => {
    setViewingReview(review);
    setShowViewDialog(true);
  };

  const handleSave = async () => {
    if (!form.staff_id || !form.review_period) return;
    setSaving(true);
    try {
      const overallRating = Object.values(form.ratings).length > 0
        ? Object.values(form.ratings).reduce((a, b) => a + b, 0) / Object.values(form.ratings).length
        : null;

      await onSaveReview({
        staff_id: form.staff_id,
        review_period: form.review_period,
        review_date: format(new Date(), 'yyyy-MM-dd'),
        ratings: form.ratings,
        overall_rating: overallRating,
        strengths: form.strengths || null,
        areas_for_improvement: form.areas_for_improvement || null,
        goals: form.goals || null,
        comments: form.comments || null,
        status: form.status
      }, editingReview?.id);
      setShowDialog(false);
      setEditingReview(null);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const getStaffName = (id: string) => staff.find(s => s.id === id)?.name || 'Unknown';

  const renderStars = (rating: number | null) => {
    if (!rating) return '-';
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < fullStars
                ? 'text-yellow-500 fill-yellow-500'
                : i === fullStars && hasHalf
                ? 'text-yellow-500 fill-yellow-200'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Performance Reviews</CardTitle>
            <CardDescription>Evaluate staff performance and track goals</CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setEditingReview(null); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Review
          </Button>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{reviews.length}</p>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {reviews.filter(r => r.status === 'draft').length}
                </p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {reviews.filter(r => r.status === 'submitted').length}
                </p>
                <p className="text-sm text-muted-foreground">Submitted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {reviews.length > 0
                    ? (reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / reviews.length).toFixed(1)
                    : '-'}
                </p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </CardContent>
            </Card>
          </div>

          {/* Reviews Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Review Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No performance reviews yet
                    </TableCell>
                  </TableRow>
                ) : reviews.map(review => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">{getStaffName(review.staff_id)}</TableCell>
                    <TableCell>{review.review_period}</TableCell>
                    <TableCell>{renderStars(review.overall_rating)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        review.status === 'acknowledged' ? 'default' :
                        review.status === 'submitted' ? 'secondary' : 'outline'
                      }>
                        {review.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(review.review_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleView(review)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(review)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Review Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReview ? 'Edit' : 'New'} Performance Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Staff *</Label>
                <Select value={form.staff_id} onValueChange={(v) => setForm(p => ({ ...p, staff_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {staff.filter(s => s.is_active).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Review Period *</Label>
                <Input 
                  type="month" 
                  value={form.review_period} 
                  onChange={(e) => setForm(p => ({ ...p, review_period: e.target.value }))} 
                />
              </div>
            </div>

            {/* Rating Criteria */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Performance Ratings</Label>
              {RATING_CRITERIA.map(criteria => (
                <div key={criteria.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{criteria.label}</Label>
                      <p className="text-xs text-muted-foreground">{criteria.description}</p>
                    </div>
                    <span className="font-medium w-8 text-right">
                      {form.ratings[criteria.key] || 0}
                    </span>
                  </div>
                  <Slider
                    value={[form.ratings[criteria.key] || 0]}
                    onValueChange={([val]) => setForm(p => ({ 
                      ...p, 
                      ratings: { ...p.ratings, [criteria.key]: val } 
                    }))}
                    max={5}
                    step={0.5}
                    className="w-full"
                  />
                </div>
              ))}
              {Object.keys(form.ratings).length > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    Overall Score: {(Object.values(form.ratings).reduce((a, b) => a + b, 0) / Object.values(form.ratings).length).toFixed(1)} / 5
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Strengths</Label>
              <Textarea 
                value={form.strengths} 
                onChange={(e) => setForm(p => ({ ...p, strengths: e.target.value }))} 
                placeholder="Key strengths and achievements..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Areas for Improvement</Label>
              <Textarea 
                value={form.areas_for_improvement} 
                onChange={(e) => setForm(p => ({ ...p, areas_for_improvement: e.target.value }))} 
                placeholder="Skills or behaviors to develop..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Goals for Next Period</Label>
              <Textarea 
                value={form.goals} 
                onChange={(e) => setForm(p => ({ ...p, goals: e.target.value }))} 
                placeholder="SMART goals for improvement..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Comments</Label>
              <Textarea 
                value={form.comments} 
                onChange={(e) => setForm(p => ({ ...p, comments: e.target.value }))} 
                placeholder="Any other feedback..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submit for Review</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Review Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Performance Review - {viewingReview && getStaffName(viewingReview.staff_id)}</DialogTitle>
          </DialogHeader>
          {viewingReview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Review Period</p>
                  <p className="font-medium">{viewingReview.review_period}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Overall Rating</p>
                  {renderStars(viewingReview.overall_rating)}
                </div>
              </div>

              {viewingReview.ratings && Object.keys(viewingReview.ratings).length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {RATING_CRITERIA.map(criteria => (
                    <div key={criteria.key} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{criteria.label}</span>
                      <span className="font-medium">{viewingReview.ratings[criteria.key] || '-'}</span>
                    </div>
                  ))}
                </div>
              )}

              {viewingReview.strengths && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Strengths</p>
                  <p className="text-sm whitespace-pre-wrap">{viewingReview.strengths}</p>
                </div>
              )}

              {viewingReview.areas_for_improvement && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Areas for Improvement</p>
                  <p className="text-sm whitespace-pre-wrap">{viewingReview.areas_for_improvement}</p>
                </div>
              )}

              {viewingReview.goals && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Goals</p>
                  <p className="text-sm whitespace-pre-wrap">{viewingReview.goals}</p>
                </div>
              )}

              {viewingReview.comments && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Comments</p>
                  <p className="text-sm whitespace-pre-wrap">{viewingReview.comments}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
