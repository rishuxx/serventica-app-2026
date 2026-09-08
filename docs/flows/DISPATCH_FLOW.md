# SERVENTICA — Partner Dispatch & Matching Engine

```text
1. DISPATCH TRIGGER
   - Booking reaches `CONFIRMED` state
   - Dispatch job enqueued

2. CANDIDATE PARTNER DISCOVERY (PostGIS)
   - Filter 1: Assigned Service Zone contains customer location
   - Filter 2: Partner verified and status = `AVAILABLE`
   - Filter 3: Partner possesses required category skill tag
   - Filter 4: Partner has no overlapping active job in scheduled time window

3. CANDIDATE RANKING
   - Distance to customer address (PostGIS distance sorting)
   - Partner rating (higher weight for 4.8+)
   - Historical acceptance rate
   - Workload balance across partners in zone

4. DISPATCH TIMEOUT & CASCADE
   - Job offered to Rank 1 partner with 45s countdown
   - If rejected / timed out: cascade to Rank 2 partner
   - If all partners exhausted: escalate to Operations Dashboard
```
