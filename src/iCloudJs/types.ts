/**
 * Unsure the actual Schema, this is just my result converted to a type.
 */
export type AccountInfo = {
    dsInfo: {
      lastName: string
      iCDPEnabled: boolean
      tantorMigrated: boolean
      dsid: string
      hsaEnabled: boolean
      isHideMyEmailSubscriptionActive: boolean
      ironcadeMigrated: boolean
      locale: string
      brZoneConsolidated: boolean
      isManagedAppleID: boolean
      isCustomDomainsFeatureAvailable: boolean
      isHideMyEmailFeatureAvailable: boolean
      "gilligan-invited": boolean
      appleIdAliases: Array<string>
      hsaVersion: number
      ubiquityEOLEnabled: boolean
      isPaidDeveloper: boolean
      countryCode: string
      notificationId: string
      primaryEmailVerified: boolean
      aDsID: string
      locked: boolean
      hasICloudQualifyingDevice: boolean
      primaryEmail: string
      appleIdEntries: Array<{
        isPrimary: boolean
        type: string
        value: string
      }>
      "gilligan-enabled": boolean
      fullName: string
      mailFlags: {
        isThreadingAvailable: boolean
        isSearchV2Provisioned: boolean
        isCKMail: boolean
      }
      languageCode: string
      appleId: string
      hasUnreleasedOS: boolean
      analyticsOptInStatus: boolean
      firstName: string
      iCloudAppleIdAlias: string
      notesMigrated: boolean
      beneficiaryInfo: {
        isBeneficiary: boolean
      }
      hasPaymentInfo: boolean
      pcsDeleted: boolean
      isCustomDomainTransferSubscriptionActive: boolean
      appleIdAlias: string
      brMigrated: boolean
      statusCode: number
      familyEligible: boolean
    }
    hasMinimumDeviceForPhotosWeb: boolean
    iCDPEnabled: boolean
    webservices: {
      reminders: {
        url: string
        status: string
      }
      notes: {
        url: string
        status: string
      }
      mail: {
        url: string
        status: string
      }
      ckdatabasews: {
        pcsRequired: boolean
        url: string
        status: string
      }
      photosupload: {
        pcsRequired: boolean
        url: string
        status: string
      }
      mcc: {
        url: string
        status: string
      }
      photos: {
        pcsRequired: boolean
        uploadUrl: string
        url: string
        status: string
      }
      drivews: {
        pcsRequired: boolean
        url: string
        status: string
      }
      uploadimagews: {
        url: string
        status: string
      }
      schoolwork: any
      cksharews: {
        url: string
        status: string
      }
      findme: {
        url: string
        status: string
      }
      ckdeviceservice: {
        url: string
      }
      iworkthumbnailws: {
        url: string
        status: string
      }
      mccgateway: {
        url: string
        status: string
      }
      calendar: {
        url: string
        status: string
      }
      docws: {
        pcsRequired: boolean
        url: string
        status: string
      }
      settings: {
        url: string
        status: string
      }
      premiummailsettings: {
        url: string
        status: string
      }
      ubiquity: {
        url: string
        status: string
      }
      streams: {
        url: string
        status: string
      }
      keyvalue: {
        url: string
        status: string
      }
      archivews: {
        url: string
        status: string
      }
      push: {
        url: string
        status: string
      }
      iwmb: {
        url: string
        status: string
      }
      iworkexportws: {
        url: string
        status: string
      }
      sharedlibrary: {
        url: string
        status: string
      }
      geows: {
        url: string
        status: string
      }
      account: {
        iCloudEnv: {
          shortId: string
          vipSuffix: string
        }
        url: string
        status: string
      }
      contacts: {
        url: string
        status: string
      }
    }
    pcsEnabled: boolean
    configBag: {
      urls: {
        accountCreateUI: string
        accountLoginUI: string
        accountLogin: string
        accountRepairUI: string
        downloadICloudTerms: string
        repairDone: string
        accountAuthorizeUI: string
        vettingUrlForEmail: string
        accountCreate: string
        getICloudTerms: string
        vettingUrlForPhone: string
      }
      accountCreateEnabled: boolean
    }
    hsaTrustedBrowser: boolean
    appsOrder: Array<string>
    version: number
    isExtendedLogin: boolean
    pcsServiceIdentitiesIncluded: boolean
    hsaChallengeRequired: boolean
    requestInfo: {
      country: string
      timeZone: string
      region: string
    }
    pcsDeleted: boolean
    iCloudInfo: {
      SafariBookmarksHasMigratedToCloudKit: boolean
    }
    apps: {
      calendar: any
      reminders: any
      keynote: {
        isQualifiedForBeta: boolean
      }
      settings: {
        canLaunchWithOneFactor: boolean
      }
      mail: any
      numbers: {
        isQualifiedForBeta: boolean
      }
      photos: any
      pages: {
        isQualifiedForBeta: boolean
      }
      notes3: any
      find: {
        canLaunchWithOneFactor: boolean
      }
      iclouddrive: any
      newspublisher: {
        isHidden: boolean
      }
      contacts: any
    }
  }
