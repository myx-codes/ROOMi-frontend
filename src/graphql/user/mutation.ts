import { gql } from '@apollo/client'

/**************************
 *         MEMBER         *
 *************************/

export const LOGIN = gql`
  mutation Login($memberNick: String!, $memberPassword: String!) {
    login(input: { memberNick: $memberNick, memberPassword: $memberPassword }) {
      _id
      memberType
      memberStatus
      memberAuthType
      memberPhone
      memberNick
      memberFullName
      memberImage
      memberRank
      memberProperties
      memberArticles
      memberPoints
      memberLikes
      memberViews
      memberComments
      memberWarnings
      memberBlocks
      deletedAt
      createdAt
      updatedAt
      accessToken
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`


export const SIGN_UP = gql `
mutation Signup($input: MemberInput!) {
    signup(input: $input) {
        _id
        memberType
        memberStatus
        memberAuthType
        memberPhone
        memberNick
        memberFullName
        memberImage
        memberProperties
        memberArticles
        memberPoints
        memberLikes
        memberViews
        memberComments
        memberRank
        memberWarnings
        memberBlocks
        deletedAt
        createdAt
        updatedAt
    }
}
`;

export const CREATE_COMMENT = gql `
mutation CreateComment($input: CommentInput!) {
    createComment(input: $input) {
        _id
        commentStatus
        commentGroup
        commentContent
        commentStars
        commentRefId
        memberId
        createdAt
        updatedAt
        memberData {
            _id
            memberType
            memberStatus
            memberAuthType
            memberPhone
            memberNick
            memberFullName
            memberImage
            memberProperties
            memberArticles
            memberPoints
            memberLikes
            memberViews
            memberComments
            memberRank
            memberWarnings
            memberBlocks
            deletedAt
            createdAt
            updatedAt
            accessToken
        }
    }
}
`
;

export const UPDATE_COMMENT = gql `
mutation UpdateComment($input: CommentUpdate!) {
    updateComment(input: $input) {
        _id
        commentContent
        commentStars
        updatedAt
    }
}
`;

export const UPDATE_MEMBER = gql `
  mutation UpdateMember($input: MemberUpdate!) {
    updateMember(input: $input) {
        _id
        memberType
        memberStatus
        memberAuthType
        memberPhone
        memberNick
        memberFullName
        memberImage
        memberProperties
        memberArticles
        memberLikes
        memberViews
        memberComments
        memberRank
        memberWarnings
        memberBlocks
        deletedAt
        createdAt
        updatedAt
        accessToken
        meLiked {
            memberId
            likeRefId
            myFavorite
        }
        memberPoints
    }
}
`;

export const CREATE_BOOKINGS = gql `
mutation CreateBooking($input: BookingInput!) {
    createBooking(input: $input) {
        _id
        bookingStatus
        bookingCheckIn
        bookingCheckOut
        bookingPrice
        bookingGuests
        propertyId
        memberId
        createdAt
        updatedAt
        propertyData {
            _id
            propertyType
            propertyStatus
            propertyLocation
            propertyAddress
            propertyTitle
            propertyPrice
            propertySquare
            propertyBeds
            propertyRooms
            propertyViews
            propertyLikes
            propertyComments
            propertyRank
            propertyImages
            propertyDesc
            memberId
            deletedAt
            constructedAt
            createdAt
            updatedAt
        }
        memberData {
            _id
            memberType
            memberStatus
            memberAuthType
            memberPhone
            memberNick
            memberFullName
            memberImage
            memberProperties
            memberArticles
            memberPoints
            memberLikes
            memberViews
            memberComments
            memberRank
            memberWarnings
            memberBlocks
            deletedAt
            createdAt
            updatedAt
            accessToken
        }
    }
}
`

export const CREATE_BOOKABLE_UNIT = gql`
  mutation CreateBookableUnit($input: BookableUnitInput!) {
    createBookableUnit(input: $input) {
      _id
      propertyId
      unitType
      name
      code
      inventoryCount
      basePrice
      rateModel
      bookingMode
      maxGuests
      includedGuests
      bedrooms
      beds
      bathrooms
      cleaningFee
      petFee
      extraGuestFee
      petsAllowed
      infantsAllowed
      amenities
      status
    }
  }
`

export const ARCHIVE_BOOKABLE_UNIT = gql`
  mutation ArchiveBookableUnit($unitId: String!) {
    archiveBookableUnit(unitId: $unitId) {
      _id
      status
    }
  }
`

export const SET_UNIT_CALENDAR_DATES = gql`
  mutation SetUnitCalendarDates($input: UnitCalendarInput!) {
    setUnitCalendarDates(input: $input)
  }
`

export const CANCEL_BOOKING = gql`
  mutation CancelBooking($bookingId: String!) {
    cancelBooking(bookingId: $bookingId) {
      _id
      bookingStatus
      updatedAt
    }
  }
`

export const LIKE_TARGET_PROPERTY = gql`
  mutation LikeTargetProperty($propertyId: String!) {
    likeTargetProperty(propertyId: $propertyId) {
      _id
      propertyLikes
      meLiked {
        memberId
        likeRefId
        myFavorite
      }
    }
  }
`

/**************************
 *         AGENT          *
 *************************/

export const IMAGES_UPLOADER = gql `
mutation ImagesUploader($files: [Upload!]!, $target: String!) {
    imagesUploader(files: $files, target: $target)
}
`;

export const CREATE_PROPERTY = gql `
mutation CreateProperty($input: PropertyInput!) {
    createProperty(input: $input) {
        _id
        propertyType
        propertyStatus
        propertyLocation
        propertyAddress
        propertyTitle
        propertyPrice
        dynamicPricingEnabled
        weekendMultiplier
        minMultiplier
        maxMultiplier
        manualMultiplierOverride
        propertySquare
        propertyBeds
        propertyRooms
        propertyViews
        propertyLikes
        propertyComments
        propertyRank
        propertyImages
        propertyDesc
        memberId
        deletedAt
        constructedAt
        createdAt
        updatedAt
        memberData {
            _id
            memberType
            memberStatus
            memberAuthType
            memberPhone
            memberNick
            memberFullName
            memberImage
            memberProperties
            memberArticles
            memberPoints
            memberLikes
            memberViews
            memberComments
            memberRank
            memberWarnings
            memberBlocks
            deletedAt
            createdAt
            updatedAt
            accessToken
        }
        meLiked {
            memberId
            likeRefId
            myFavorite
        }
    }
}
`;

export const UPDATE_PROPERTY = gql `
mutation UpdateMyProperty($input: PropertyUpdate!) {
    updateProperty(input: $input) {
        _id
        propertyTitle
        propertyPrice
        dynamicPricingEnabled
        weekendMultiplier
        minMultiplier
        maxMultiplier
        manualMultiplierOverride
        propertyStatus
        propertyImages
        updatedAt
    }
}
`;

/**************************
 *         ADMIN          *
 *************************/

export const UPDATE_MEMBERS_BY_ADMIN = gql`
    mutation UpdateMembersByAdmin($input: MemberUpdate!) {
        updateMembersByAdmin(input: $input) {
            _id
            memberNick
            memberPhone
            memberType
            memberStatus
            memberFullName
            memberImage
            updatedAt
        }
    }
`

export const UPDATE_PROPERTY_BY_ADMIN = gql`
    mutation UpdatePropertyByAdmin($input: PropertyUpdate!) {
        updatePropertyByAdmin(input: $input) {
            _id
            propertyStatus
            updatedAt
        }
    }
`

export const REMOVE_PROPERTY_BY_ADMIN = gql`
    mutation RemovePropertyByAdmin($propertyId: String!) {
        removePropertyByAdmin(propertyId: $propertyId) {
            _id
            propertyTitle
            propertyStatus
        }
    }
`

export const UPDATE_BOARD_ARTICLE_BY_ADMIN = gql`
    mutation UpdateBoardArticleByAdmin($input: BoardArticleUpdate!) {
        updateBoardArticleByAdmin(input: $input) {
            _id
            articleCategory
            articleStatus
            articleTitle
            articleContent
            articleImage
            updatedAt
        }
    }
`

export const REMOVE_BOARD_ARTICLE_BY_ADMIN = gql`
    mutation RemoveBoardArticleByAdmin($articleId: String!) {
        removeBoardArticleByAdmin(articleId: $articleId) {
            _id
            articleTitle
            articleStatus
        }
    }
`

export const REMOVE_COMMENT_BY_ADMIN = gql`
    mutation RemoveCommentByAdmin($commentId: String!) {
        removeCommentByAdmin(commentId: $commentId) {
            _id
            commentGroup
            commentRefId
            commentContent
            commentStars
            memberId
            createdAt
            updatedAt
        }
    }
`
