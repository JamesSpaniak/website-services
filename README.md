# Personal Site
Backend -- backend, Frontend -- drone


## Todo List 
### Frontend
- Video and Image components (how will video be served?) -- Infra/CDN related
    - Initial is vimeo for video + public/ folder for images. - Complete-->Test video todo
    - Future Goal is to do s3 + aws cloudfront + aws mediaconvert
- integrate stripe SDK into purchase-flow
- Usability
    - Course preview/list should be more clear if user owns the course
    - Course/Unit/Section/Exam needs enhancements around nested boxes
    - Dark mode / theme unification across pages
### Backend
- Logging and metrics collection
- Setup infra for everything together + Validate migrations all work
- Usability
    - Article content enhancement to support images within text
    - Purchasing course flow and memberships for monthly stuff, scheduled job to update for expired memberships, emails and purchase things.
        - How will security be managed of the card?
### Infra
- Test terraform
- AWS->Github connection
    - Step 1: Create the OIDC Identity Provider in AWS
    - Step 2: Create the IAM Role for GitHub Actions
    - Step 3: Attach Permissions
    - Step 4: Name and Create the Role
    - Step 5: Configure GitHub Secrets



### Content
- Article 1
- Course 1
- Images