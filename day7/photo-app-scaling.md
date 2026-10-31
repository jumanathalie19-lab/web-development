Day 7 Assignment: Scaling Plan for SnapShare
Assumptions
10,000,000 registered users 
10% are active each day 
Each active user uploads 1 photo per day 
Each active user views 50 feed pages per day 
Average photo size = 2 MB 
 Thumbnail size = 50 KB 
1 day ≈ 100,000 seconds (for estimation) 
 Peak traffic ≈ 5× average traffic
Load Estimates
Uploads: 1,000,000/day ≈ 10/sec average, 50/sec peak.
 Feed views: 50,000,000/day ≈ 500/sec average, 2,500/sec peak. 
Storage: ~2.05 TB/day ≈ 748 TB/year.
Read vs Write
The system is read-heavy: roughly 50 feed views per upload. Therefore caching, CDNs and read replicas are important.
Photo Storage
Photos should be stored in object storage (e.g. S3/Blob Storage) rather than the database. The database stores only metadata and URLs.
Architecture Diagram
Browser/Mobile -> DNS -> CDN -> Load Balancer -> App Servers -> Redis Cache; App Servers -> Primary DB -> Read Replica; App Servers -> Queue -> Worker; Photos stored in Object Storage.![alt text](<Architecture diagram.drawio.png>)

Components description in one sentence
All the components work together to make SnapShare scalable, fast, reliable, and efficient by directing different types of work to the specialized systems best suited to handle them.

Upload Flow
1.	User selects a photo in the mobile app.
2.	Request reaches the load balancer.
3.	Load balancer forwards the request to an app server.
4.	App server stores the photo in object storage.
5.	App server writes photo metadata to the primary database.
6.	App server adds a thumbnail-generation job to the queue.
7.	App server returns:
201 Created
8.	Worker reads the job from the queue.
9.	Worker generates a thumbnail.
10.	Thumbnail is saved to object storage.
11.	Thumbnail location is updated in the database.
12.	Feed caches are invalidated if necessary.

Trade-offs
1.	Speed vs freshness: caches may show slightly stale data.
Feed data is cached in Redis.
Benefits:
Faster feed loading
Reduced database load
Cost:
Users may briefly see slightly outdated feed content.

2.	Consistency vs availability: replicas may briefly lag.
Read replicas may lag behind the primary database by a small amount.
Benefits:
Higher read throughput
Better scalability
Cost:
Recently uploaded photos may not appear immediately on every read.

 3. Cost vs reliability: extra servers improve uptime but cost more.
Multiple app servers, replicas, and CDN locations increase uptime.
Benefits:
Higher availability
Better fault tolerance
cost
Higher infrastructure expenses.
