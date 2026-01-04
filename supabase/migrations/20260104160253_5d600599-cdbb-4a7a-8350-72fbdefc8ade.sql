-- Enable realtime for invoices table so tenant panels get instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;